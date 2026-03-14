"use strict";

/**
 * Domain deployment routes.
 *
 * Flow:
 *  1. POST /api/domain/discover   — queue a discovery command on the gateway agent
 *  2. GET  /api/domain/discover/:discoveryId — poll for AD machine list
 *  3. POST /api/domain/deploy     — queue remote-install commands per target
 *  4. GET  /api/domain/deploy/:deploymentId  — poll for per-machine status
 *  5. PATCH /api/domain/deploy/:deploymentId/result — agent reports per-machine result
 *
 * Discovery & deployment state is stored in Catalyst Cache (transient — 24 h TTL).
 */

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function cacheGet(catalyst, key) {
  try {
    const segment = catalyst.cache().segment("domain");
    const entry = await segment.getValue(key);
    if (!entry || !entry.cache_value) return null;
    return JSON.parse(entry.cache_value);
  } catch {
    return null;
  }
}

async function cacheSet(catalyst, key, value) {
  const segment = catalyst.cache().segment("domain");
  await segment.put({
    cache_name: key,
    cache_value: JSON.stringify(value),
    expiry_in_hours: 24,
  });
}

// ── POST /api/domain/discover ─────────────────────────────────────────────────
router.post("/discover", async (req, res) => {
  const { gatewayMachineId, domainName, useServiceAccount, username } = req.body || {};
  if (!gatewayMachineId || !domainName) {
    return res.status(400).json({ error: "gatewayMachineId and domainName are required" });
  }

  const discoveryId = uuidv4();

  // Persist initial state
  await cacheSet(req.catalyst, `discover:${discoveryId}`, {
    discoveryId,
    gatewayMachineId,
    domainName,
    status: "pending",
    machines: [],
    createdAt: new Date().toISOString(),
  });

    // Queue command on the gateway agent.
    // NOTE: only useServiceAccount flag and username are stored — never the password.
    // The password is NOT persisted; the agent uses its currently-running service account
    // credentials when useServiceAccount=true, or prompts via a secure channel otherwise.
    try {
      await req.catalyst.datastore().table("Installations").insertRow({
        install_id:   discoveryId,
        machine_id:   gatewayMachineId,
        product_name: "__domain_discover__",
        file_type:    "__domain_discover__",
        build_number: domainName,
        log_output:   JSON.stringify({
          useServiceAccount: !!useServiceAccount,
          username:          useServiceAccount ? "" : (username || ""),
          // Password intentionally omitted — agent uses its service account
        }),
        status:     "pending",
        started_at: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ error: `Failed to queue discovery command: ${err.message}` });
    }

  res.status(202).json({ discoveryId });
});

// ── GET /api/domain/discover/:discoveryId ─────────────────────────────────────
router.get("/discover/:discoveryId", async (req, res) => {
  const state = await cacheGet(req.catalyst, `discover:${req.params.discoveryId}`);
  if (!state) {
    // Also check if the command task still exists in Installations
    return res.status(404).json({ error: "Discovery job not found or expired" });
  }
  res.json(state);
});

// ── POST /api/domain/deploy ───────────────────────────────────────────────────
router.post("/deploy", async (req, res) => {
  const { gatewayMachineId, targets, agentDownloadUrl, credentials } = req.body || {};
  if (!gatewayMachineId || !Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ error: "gatewayMachineId and targets[] are required" });
  }

  const deploymentId = uuidv4();
  const now = new Date().toISOString();

  const results = targets.map((t) => ({
    machine:     t.name || t.hostname,
    fqdn:        t.fqdn || "",
    ip:          t.ip   || "",
    os:          t.os   || "Windows",
    status:      "queued",
    steps: [
      { key: "ping",     label: "Connectivity Check", status: "pending" },
      { key: "copy",     label: "Copy Installer",     status: "pending" },
      { key: "install",  label: "Run Installer",      status: "pending" },
      { key: "verify",   label: "Verify Service",     status: "pending" },
      { key: "register", label: "Register Agent",     status: "pending" },
    ],
    log: "",
    error: null,
    startedAt: null,
    completedAt: null,
  }));

  // Persist deployment state
  await cacheSet(req.catalyst, `deploy:${deploymentId}`, {
    deploymentId,
    gatewayMachineId,
    agentDownloadUrl: agentDownloadUrl || "",
    status: "running",
    results,
    createdAt: now,
  });

  // Queue one command per target on the gateway agent.
  // Credentials (if provided) are stored with the password omitted — the agent uses
  // its own service account or a pre-authorised domain account configured at install time.
  const table = req.catalyst.datastore().table("Installations");
  const safeCredentials = credentials
    ? { user: credentials.user || "" }  // password intentionally excluded
    : null;

  try {
    for (const t of targets) {
      await table.insertRow({
        install_id:   uuidv4(),
        machine_id:   gatewayMachineId,
        product_name: "__remote_deploy__",
        file_type:    "__remote_deploy__",
        file_url:     agentDownloadUrl || "",
        // build_number carries: deploymentId|targetMachine
        build_number: `${deploymentId}|${t.name || t.hostname}`,
        log_output:   JSON.stringify({
          target:           t,
          credentials:      safeCredentials,
          agentDownloadUrl: agentDownloadUrl || "",
        }),
        status:     "pending",
        started_at: now,
      });
    }
  } catch (err) {
    return res.status(500).json({ error: `Failed to queue deploy commands: ${err.message}` });
  }

  res.status(202).json({ deploymentId, totalTargets: targets.length });
});

// ── GET /api/domain/deploy/:deploymentId ─────────────────────────────────────
router.get("/deploy/:deploymentId", async (req, res) => {
  const state = await cacheGet(req.catalyst, `deploy:${req.params.deploymentId}`);
  if (!state) {
    return res.status(404).json({ error: "Deployment job not found or expired" });
  }

  // Derive overall status
  const results = state.results || [];
  const done   = results.filter((r) => r.status === "done").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const overall =
    done + failed === results.length && results.length > 0 ? "complete" : "running";

  res.json({ ...state, status: overall, summary: { total: results.length, done, failed } });
});

// ── PATCH /api/domain/deploy/:deploymentId/result — agent pushes per-machine update
// This route is called by the agent (X-Agent-Token) NOT the user browser.
router.patch("/deploy/:deploymentId/result", async (req, res) => {
  const { machine, status, steps, log, error } = req.body || {};
  if (!machine || !status) {
    return res.status(400).json({ error: "machine and status are required" });
  }

  const state = await cacheGet(req.catalyst, `deploy:${req.params.deploymentId}`);
  if (!state) {
    return res.status(404).json({ error: "Deployment job not found or expired" });
  }

  const now = new Date().toISOString();
  const updated = {
    ...state,
    results: state.results.map((r) => {
      if (r.machine !== machine) return r;
      return {
        ...r,
        status,
        steps:       steps || r.steps,
        log:         log   || r.log,
        error:       error || r.error,
        completedAt: ["done", "failed"].includes(status) ? now : r.completedAt,
        startedAt:   r.startedAt || now,
      };
    }),
  };

  await cacheSet(req.catalyst, `deploy:${req.params.deploymentId}`, updated);
  res.json({ ok: true });
});

module.exports = router;
