/**
 * Domain Discovery
 *
 * Queries Active Directory for all computer accounts, checks ICMP reachability,
 * and detects whether the Log360 Dev Suite agent is already installed on each machine.
 *
 * Discovery methods (tried in order):
 *  1. PowerShell Get-ADComputer (requires AD module — available on domain controllers
 *     and machines with RSAT installed)
 *  2. `nltest /dsgetdc:<domain>` + net-view fallback (no AD module required)
 *
 * Reachability check: ICMP ping via PowerShell Test-Connection
 * Agent detection:    WMI Win32_Service query via PowerShell
 */

"use strict";

const { execFile } = require("child_process");
const os = require("os");
const config = require("../config");
const api = require("./catalystClient");

const IS_WINDOWS = process.platform === "win32";

// ── PowerShell helpers ────────────────────────────────────────────────────────

function runPS(script, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    if (!IS_WINDOWS) {
      return reject(new Error("Domain discovery is only supported on Windows"));
    }
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout.trim());
      }
    );
  });
}

// ── Method 1: Get-ADComputer ──────────────────────────────────────────────────

async function discoverViaADModule(domainName) {
  const script = `
Import-Module ActiveDirectory -ErrorAction Stop
$computers = Get-ADComputer -Filter * -Server "${domainName}" -Properties OperatingSystem,LastLogonDate,IPv4Address |
  Select-Object Name, DNSHostName, IPv4Address, OperatingSystem, LastLogonDate, DistinguishedName
$computers | ConvertTo-Json -Compress
`;
  const json = await runPS(script, 120000);
  const raw = JSON.parse(json || "[]");
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((c) => ({
    name:           c.Name            || "",
    fqdn:           c.DNSHostName     || `${c.Name}.${domainName}`,
    ip:             c.IPv4Address     || "",
    os:             c.OperatingSystem || "Windows",
    ou:             extractOU(c.DistinguishedName || ""),
    lastLogon:      c.LastLogonDate   ? new Date(c.LastLogonDate).toISOString() : null,
    reachable:      false,   // filled in by ping sweep
    agentInstalled: false,   // filled in by WMI check
  }));
}

// ── Method 2: Net View fallback ────────────────────────────────────────────────

async function discoverViaNltest(domainName) {
  const script = `
$computers = Get-WmiObject -Class Win32_NTDomain -Filter "DomainName='${domainName}'" |
  ForEach-Object {
    $dc = $_.DomainControllerName.TrimStart("\\\\")
    if ($dc) {
      try {
        $adsi = [ADSI]"WinNT://$dc"
        $adsi.Children | Where-Object { $_.SchemaClassName -eq "Computer" } | ForEach-Object {
          [PSCustomObject]@{ Name = $_.Name; IP = ""; OS = "Windows"; OU = "" }
        }
      } catch {}
    }
  }
$computers | ConvertTo-Json -Compress
`;
  const json = await runPS(script, 120000);
  const raw  = JSON.parse(json || "[]");
  const arr  = Array.isArray(raw) ? raw : [raw];
  return arr.map((c) => ({
    name:           c.Name    || "",
    fqdn:           c.Name    || "",
    ip:             c.IP      || "",
    os:             c.OS      || "Windows",
    ou:             c.OU      || "",
    lastLogon:      null,
    reachable:      false,
    agentInstalled: false,
  }));
}

// ── Ping sweep ────────────────────────────────────────────────────────────────

async function checkReachability(machines) {
  if (!IS_WINDOWS || machines.length === 0) return machines;

  // Encode target list as base64 JSON to prevent PowerShell injection via
  // hostnames that contain special characters (quotes, backticks, etc.)
  const targets = machines.map((m) => m.fqdn || m.name).filter(Boolean);
  const targetsB64 = Buffer.from(JSON.stringify(targets), "utf8").toString("base64");

  const script = `
$targets = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${targetsB64}')) | ConvertFrom-Json
$results = $targets | ForEach-Object {
  $ok = Test-Connection $_ -Count 1 -Quiet -ErrorAction SilentlyContinue
  [PSCustomObject]@{ Target = $_; Reachable = $ok }
}
$results | ConvertTo-Json -Compress
`;

  try {
    const json   = await runPS(script, 60000);
    const raw    = JSON.parse(json || "[]");
    const arr    = Array.isArray(raw) ? raw : [raw];
    const lookup = {};
    arr.forEach((r) => {
      lookup[(r.Target || "").toLowerCase()] = !!r.Reachable;
    });
    return machines.map((m) => ({
      ...m,
      reachable: lookup[(m.fqdn || m.name).toLowerCase()] ?? false,
    }));
  } catch {
    return machines; // if ping sweep fails, leave reachable=false
  }
}

// ── WMI agent-installed check ─────────────────────────────────────────────────

async function checkAgentInstalled(machines) {
  if (!IS_WINDOWS) return machines;

  const reachable = machines.filter((m) => m.reachable);
  if (reachable.length === 0) return machines;

  const installed = new Set();

  // Check each reachable machine in parallel (batches of 10)
  const BATCH = 10;
  for (let i = 0; i < reachable.length; i += BATCH) {
    const batch = reachable.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (m) => {
        const target = m.fqdn || m.name;
        const script = `
$svc = Get-WmiObject Win32_Service -ComputerName '${target.replace(/'/g, "''")}' ` +
`-Filter "Name='Log360DevSuiteAgent'" -ErrorAction SilentlyContinue
if ($svc) { "true" } else { "false" }
`;
        try {
          const out = await runPS(script, 10000);
          if (out.trim() === "true") installed.add(m.name);
        } catch {
          // ignore — treat as not installed
        }
      })
    );
  }

  return machines.map((m) => ({ ...m, agentInstalled: installed.has(m.name) }));
}

// ── Main discovery function ────────────────────────────────────────────────────

async function discoverDomain(domainName, logger) {
  logger.info(`[domain-discovery] Starting discovery on domain: ${domainName}`);

  let machines = [];

  // Try AD module first
  try {
    logger.info("[domain-discovery] Trying Get-ADComputer...");
    machines = await discoverViaADModule(domainName);
    logger.info(`[domain-discovery] Get-ADComputer returned ${machines.length} machines`);
  } catch (adErr) {
    logger.warn(`[domain-discovery] AD module unavailable (${adErr.message}), trying fallback`);
    try {
      machines = await discoverViaNltest(domainName);
      logger.info(`[domain-discovery] Fallback returned ${machines.length} machines`);
    } catch (fbErr) {
      throw new Error(
        `Domain discovery failed. AD module error: ${adErr.message}. Fallback error: ${fbErr.message}`
      );
    }
  }

  if (machines.length === 0) {
    logger.warn("[domain-discovery] No machines found — check domain connectivity");
    return [];
  }

  // Ping sweep
  logger.info(`[domain-discovery] Checking reachability of ${machines.length} machines...`);
  machines = await checkReachability(machines);
  const reachableCount = machines.filter((m) => m.reachable).length;
  logger.info(`[domain-discovery] ${reachableCount}/${machines.length} machines reachable`);

  // WMI agent check
  logger.info("[domain-discovery] Checking which machines already have the agent...");
  machines = await checkAgentInstalled(machines);
  const installedCount = machines.filter((m) => m.agentInstalled).length;
  logger.info(`[domain-discovery] ${installedCount} machines already have agent installed`);

  return machines;
}

// ── Execute and report ────────────────────────────────────────────────────────

async function executeDiscovery(cmd, logger) {
  const discoveryId = cmd.install_id;
  const domainName  = cmd.build_number || ""; // stored in build_number field

  let credInfo = {};
  try {
    credInfo = JSON.parse(cmd.log_output || "{}");
  } catch {
    // ignore parse failure
  }

  logger.info(`[domain-discovery] Discovery ${discoveryId} for domain ${domainName}`);

  // Report "running"
  await api.reportCommandResult(config.machineId, discoveryId, {
    status:    "running",
    logOutput: `Discovery started for domain ${domainName}`,
  });

  try {
    const machines = await discoverDomain(domainName, logger);

    // Report results via logOutput (JSON encoded)
    await api.reportCommandResult(config.machineId, discoveryId, {
      status:    "complete",
      logOutput: JSON.stringify({ machines }),
    });

    logger.info(`[domain-discovery] Reported ${machines.length} machines to portal`);
  } catch (err) {
    logger.error(`[domain-discovery] Discovery failed: ${err.message}`);
    await api
      .reportCommandResult(config.machineId, discoveryId, {
        status:    "failed",
        logOutput: err.message,
      })
      .catch(() => {});
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractOU(distinguishedName) {
  // Extract the first OU= component from a DN
  const match = distinguishedName.match(/(?:OU=([^,]+))/g);
  if (!match || match.length === 0) return "";
  return match.join(",").replace(/OU=/g, "").split(",").reverse().join("\\");
}

module.exports = { executeDiscovery, discoverDomain };
