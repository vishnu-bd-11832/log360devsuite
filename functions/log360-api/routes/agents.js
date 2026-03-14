"use strict";

const express = require("express");
const router = express.Router();

/** GET /api/agents — list all agents visible to the user */
router.get("/", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Agents").getAllRows();
    // Filter by owner or team membership
    const visible = rows.filter(
      (r) => r.owner_email === req.user.email || r.owner_email === undefined
    );
    res.json(visible);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/agents/:machineId */
router.get("/:machineId", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Agents").getAllRows();
    const agent = rows.find((r) => r.machine_id === req.params.machineId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/agents/register — called by agent on first boot */
router.post("/register", async (req, res) => {
  const { machineId, hostname, os, platform, agentVersion, capabilities, ipAddress } =
    req.body || {};
  if (!machineId || !hostname) {
    return res.status(400).json({ error: "machineId and hostname are required" });
  }

  try {
    const table = req.catalyst.datastore().table("Agents");
    const existing = await table.getAllRows().then((rows) =>
      rows.find((r) => r.machine_id === machineId)
    );

    const now = new Date().toISOString();
    const row = {
      machine_id: machineId,
      hostname,
      os: os || "unknown",
      platform: platform || "x64",
      agent_version: agentVersion || "0.0.0",
      status: "Online",
      ip_address: ipAddress || "",
      last_seen: now,
      capabilities: JSON.stringify(capabilities || []),
    };

    if (existing) {
      await table.updateRow({ ...row, ROWID: existing.ROWID });
    } else {
      await table.insertRow(row);
    }

    res.json({ ok: true, machineId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/agents/:machineId/heartbeat */
router.post("/:machineId/heartbeat", async (req, res) => {
  const { cpu, memory, status } = req.body || {};
  try {
    const table = req.catalyst.datastore().table("Agents");
    const rows = await table.getAllRows();
    const agent = rows.find((r) => r.machine_id === req.params.machineId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    await table.updateRow({
      ROWID: agent.ROWID,
      status: status || "Online",
      last_seen: new Date().toISOString(),
      cpu_percent: String(cpu || 0),
      mem_percent: String(memory || 0),
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/agents/:machineId */
router.delete("/:machineId", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Agents");
    const rows = await table.getAllRows();
    const agent = rows.find((r) => r.machine_id === req.params.machineId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    await table.deleteRow(agent.ROWID);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/machines/:machineId/commands/pending — agent polls for work */
router.get("/:machineId/commands/pending", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Installations");
    const rows = await table.getAllRows();
    const pending = rows.filter(
      (r) => r.machine_id === req.params.machineId && r.status === "pending"
    );
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/machines/:machineId/commands/:installId/result — agent reports result */
router.post("/:machineId/commands/:installId/result", async (req, res) => {
  const { status, logOutput } = req.body || {};
  try {
    const table = req.catalyst.datastore().table("Installations");
    const rows = await table.getAllRows();
    const task = rows.find((r) => r.install_id === req.params.installId);
    if (!task) return res.status(404).json({ error: "Installation task not found" });

    await table.updateRow({
      ROWID: task.ROWID,
      status: status || "complete",
      log_output: logOutput || "",
      completed_at: new Date().toISOString(),
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
