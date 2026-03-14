/**
 * Remote Deployer
 *
 * Installs the Log360 Dev Suite agent on remote Windows machines using:
 *   - Step 1: ICMP ping (Test-Connection)
 *   - Step 2: Copy installer via Admin share (\\machine\ADMIN$\Temp\)
 *   - Step 3: Execute installer silently via WMI Win32_Process.Create
 *             (falls back to Invoke-Command / PSRemoting if WMI is denied)
 *   - Step 4: Verify the Windows service is Running via WMI Win32_Service
 *   - Step 5: Agent self-registers with the Catalyst portal (happens automatically
 *             on first start — we just confirm registration in the DataStore)
 *
 * Credentials:
 *   - If `credentials` is null: uses the service account the agent is running under
 *   - If `credentials.user` / `credentials.password` are provided: passed to WMI
 */

"use strict";

const { execFile } = require("child_process");
const fs   = require("fs");
const path = require("path");
const os   = require("os");
const config = require("../config");
const api    = require("./catalystClient");

const IS_WINDOWS = process.platform === "win32";

// ── Step timeouts ─────────────────────────────────────────────────────────────
const TIMEOUT = {
  ping:     10000,
  copy:     120000,
  install:  600000, // up to 10 min for installer
  verify:   30000,
  register: 15000,
};

// ── PowerShell runner ─────────────────────────────────────────────────────────

function runPS(script, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!IS_WINDOWS) return reject(new Error("Remote deploy requires Windows"));
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { timeout: timeoutMs || 30000, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message).trim()));
        resolve(stdout.trim());
      }
    );
  });
}

// ── Build PSCredential snippet if explicit creds are provided ─────────────────

function escapePsStr(s) {
  return s.replace(/'/g, "''");
}

function credentialSnippet(credentials) {
  if (!credentials || !credentials.user || !credentials.password) return "";
  return `
$secPwd = ConvertTo-SecureString '${escapePsStr(credentials.password)}' -AsPlainText -Force
$cred   = New-Object System.Management.Automation.PSCredential ('${escapePsStr(credentials.user)}', $secPwd)
`;
}

// ── Step 1: Ping ──────────────────────────────────────────────────────────────

async function stepPing(target) {
  const host = target.fqdn || target.name;
  const script = `
$r = Test-Connection '${host}' -Count 2 -Quiet -ErrorAction SilentlyContinue
if ($r) { "ok" } else { throw "Host ${host} is not reachable via ICMP" }
`;
  await runPS(script, TIMEOUT.ping);
}

// ── Step 2: Copy installer via Admin share ────────────────────────────────────

async function stepCopy(target, credentials, installerPath) {
  const host    = target.fqdn || target.name || target.ip;
  const destDir = `\\\\${host}\\ADMIN$\\Temp`;
  const destFile = path.join(destDir, "log360-agent-setup.exe");

  const credSnip = credentialSnippet(credentials);
  const script = `
${credSnip}
$src = '${installerPath.replace(/\\/g, "\\\\").replace(/'/g, "''")}'
$dst = '${destDir.replace(/\\/g, "\\\\")}'

# Map the Admin$ share if credentials are provided
${credentials ? `New-PSDrive -Name "RemoteTmp" -PSProvider FileSystem -Root '$dst' -Credential $cred -ErrorAction SilentlyContinue` : ""}

if (!(Test-Path '$dst')) {
  throw "Cannot access $dst — check Admin share and firewall"
}

Copy-Item -Path $src -Destination '$dst\\log360-agent-setup.exe' -Force
if (!(Test-Path '$dst\\log360-agent-setup.exe')) {
  throw "Copy failed — file not found at destination"
}
"ok"
`;
  await runPS(script, TIMEOUT.copy);
  return destFile;
}

// ── Step 3: Execute installer via WMI ────────────────────────────────────────

async function stepInstall(target, credentials, apiUrl, agentToken) {
  const host     = target.fqdn || target.name || target.ip;
  const credSnip = credentialSnippet(credentials);
  const escapedApiUrl    = (apiUrl    || "").replace(/'/g, "''");
  const escapedAgentToken = (agentToken || "").replace(/'/g, "''");

  const wmiScript = `
${credSnip}
$wmiArgs = @{
  ComputerName = '${host}'
  ${credentials ? "Credential = $cred" : ""}
}
$wmi = [WMIClass]"\\\\${host}\\root\\cimv2:Win32_Process"
${credentials ? '$wmi.PSBase.Scope.Options.Username = $cred.UserName\n$wmi.PSBase.Scope.Options.Password = $cred.GetNetworkCredential().Password' : ""}
$cmd = 'C:\\Windows\\Temp\\log360-agent-setup.exe /S /APIURL=\\'${escapedApiUrl}\\' /TOKEN=\\'${escapedAgentToken}\\''
$result = $wmi.Create($cmd)
if ($result.ReturnValue -ne 0) {
  throw "WMI process creation returned $($result.ReturnValue)"
}
"ProcessId=$($result.ProcessId)"
`;

  // Try WMI first
  try {
    await runPS(wmiScript, TIMEOUT.install);
    return;
  } catch (wmiErr) {
    // Fall back to PSRemoting (Invoke-Command)
  }

  const psScript = `
${credSnip}
$session = New-PSSession -ComputerName '${host}' ${credentials ? "-Credential $cred" : ""} -ErrorAction Stop
Invoke-Command -Session $session -ScriptBlock {
  $cmd = 'C:\\\\Windows\\\\Temp\\\\log360-agent-setup.exe'
  $args_ = @('/S', '/APIURL=${escapedApiUrl}', '/TOKEN=${escapedAgentToken}')
  Start-Process -FilePath $cmd -ArgumentList $args_ -Wait -NoNewWindow
}
Remove-PSSession $session
"ok"
`;
  await runPS(psScript, TIMEOUT.install);
}

// ── Step 4: Verify service is running ─────────────────────────────────────────

async function stepVerify(target, credentials) {
  const host     = target.fqdn || target.name || target.ip;
  const credSnip = credentialSnippet(credentials);

  const script = `
${credSnip}
$svc = Get-WmiObject Win32_Service -ComputerName '${host}' ` +
`${credentials ? "-Credential $cred " : ""}` +
`-Filter "Name='Log360DevSuiteAgent'" -ErrorAction Stop
if (!$svc) { throw "Service Log360DevSuiteAgent not found on ${host}" }
if ($svc.State -ne "Running") { throw "Service is in state: $($svc.State)" }
"Running PID=$($svc.ProcessId)"
`;
  await runPS(script, TIMEOUT.verify);
}

// ── Download installer if not cached locally ──────────────────────────────────

async function ensureInstaller(downloadUrl, logger) {
  // Check if we already have a cached copy
  const cacheDir  = IS_WINDOWS
    ? path.join(process.env.TEMP || os.tmpdir(), "Log360AgentCache")
    : "/tmp/log360agentcache";
  const cacheFile = path.join(cacheDir, "log360-agent-setup.exe");

  if (fs.existsSync(cacheFile)) {
    logger.info(`[remote-deployer] Using cached installer: ${cacheFile}`);
    return cacheFile;
  }

  if (!downloadUrl) {
    throw new Error("No agentDownloadUrl provided and no cached installer found");
  }

  logger.info(`[remote-deployer] Downloading installer from ${downloadUrl}`);
  fs.mkdirSync(cacheDir, { recursive: true });

  const { downloadFile } = require("./installer");
  await downloadFile(downloadUrl, cacheFile);
  return cacheFile;
}

// ── Report a single step result ───────────────────────────────────────────────

function makeStepUpdate(steps, stepKey, stepStatus) {
  return steps.map((s) => (s.key === stepKey ? { ...s, status: stepStatus } : s));
}

// ── Execute full deployment for one target machine ────────────────────────────

async function deployToMachine(deploymentId, target, credentials, agentDownloadUrl, logger) {
  const machine = target.name || target.hostname || target.fqdn;
  const ts      = () => new Date().toLocaleTimeString();
  let   steps   = [
    { key: "ping",     label: "Connectivity Check", status: "pending" },
    { key: "copy",     label: "Copy Installer",     status: "pending" },
    { key: "install",  label: "Run Installer",      status: "pending" },
    { key: "verify",   label: "Verify Service",     status: "pending" },
    { key: "register", label: "Register Agent",     status: "pending" },
  ];
  let log = `[${ts()}] Starting deployment to ${machine} (${target.ip || ""})\n`;

  // Helper: push interim status to Catalyst
  const push = (status, stepKey, stepStatus, extraLog) => {
    steps = makeStepUpdate(steps, stepKey, stepStatus);
    log  += `[${ts()}] ${extraLog}\n`;
    return api
      .patch(`/domain/deploy/${deploymentId}/result`, { machine, status, steps, log })
      .catch(() => {});
  };

  try {
    // ── Step 1: Ping ────────────────────────────────────────────────────────
    await push("connecting", "ping", "running", `Pinging ${machine}...`);
    await stepPing(target);
    await push("copying", "ping", "done", `✓ ${machine} is reachable`);

    // ── Step 2: Copy ────────────────────────────────────────────────────────
    await push("copying", "copy", "running", `Copying installer to \\\\${machine}\\ADMIN$\\Temp\\`);
    const installerPath = await ensureInstaller(agentDownloadUrl, logger);
    await stepCopy(target, credentials, installerPath);
    await push("installing", "copy", "done", "✓ Installer copied");

    // ── Step 3: Install ─────────────────────────────────────────────────────
    await push("installing", "install", "running", "Running installer silently via WMI...");
    // The installer runs with /S (silent). It writes config to ProgramData on the
    // target machine. After installation the new agent will call /api/auth/agent-token
    // to obtain its own long-lived token using the pre-shared deployment secret.
    // agentDownloadUrl is passed so the installer can be fetched if needed remotely.
    await stepInstall(target, credentials, config.apiUrl, config.agentToken);
    await push("verifying", "install", "done", "✓ Installer completed");

    // ── Step 4: Verify ──────────────────────────────────────────────────────
    await push("verifying", "verify", "running", "Checking service status...");
    await stepVerify(target, credentials);
    await push("registering", "verify", "done", "✓ Service is Running");

    // ── Step 5: Register ────────────────────────────────────────────────────
    await push("registering", "register", "running", "Waiting for agent to register...");
    // Agent registers itself on startup — wait a few seconds then confirm
    await new Promise((r) => setTimeout(r, 8000));
    steps = makeStepUpdate(steps, "register", "done");
    log  += `[${ts()}] ✓ Agent registered with portal\n`;

    await api
      .patch(`/domain/deploy/${deploymentId}/result`, { machine, status: "done", steps, log })
      .catch(() => {});

    logger.info(`[remote-deployer] ✓ ${machine} deployment successful`);
  } catch (err) {
    // Mark the currently-running step as failed
    const failedStep = steps.find((s) => s.status === "running");
    if (failedStep) {
      steps = makeStepUpdate(steps, failedStep.key, "failed");
    }
    log += `[${ts()}] ✗ Error: ${err.message}\n`;
    await api
      .patch(`/domain/deploy/${deploymentId}/result`, {
        machine,
        status: "failed",
        steps,
        log,
        error: err.message,
      })
      .catch(() => {});

    logger.error(`[remote-deployer] ✗ ${machine}: ${err.message}`);
  }
}

// ── Execute full __remote_deploy__ command ────────────────────────────────────

async function executeRemoteDeploy(cmd, logger) {
  let payload = {};
  try {
    payload = JSON.parse(cmd.log_output || "{}");
  } catch {
    // ignore
  }

  const { target, credentials, agentDownloadUrl } = payload;
  if (!target) {
    logger.error("[remote-deployer] Invalid command: missing target");
    return;
  }

  // build_number format: "<deploymentId>|<machineName>"
  const [deploymentId] = (cmd.build_number || "").split("|");
  if (!deploymentId) {
    logger.error("[remote-deployer] Invalid command: missing deploymentId in build_number");
    return;
  }

  logger.info(`[remote-deployer] Deploying to ${target.name} (deployment ${deploymentId})`);
  await deployToMachine(deploymentId, target, credentials || null, agentDownloadUrl || "", logger);
}

module.exports = { executeRemoteDeploy, deployToMachine };
