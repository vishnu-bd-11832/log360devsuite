"use strict";

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

/** GET /api/machines */
router.get("/", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Machines").getAllRows();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/machines */
router.post("/", async (req, res) => {
  const { name, type, os, teamId, ipAddress } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });

  const row = {
    machine_id: uuidv4(),
    name,
    type: type || "user",
    os: os || "Windows",
    owner_email: req.user.email,
    team_id: teamId || "",
    ip_address: ipAddress || "",
    agent_version: "not installed",
    status: "Offline",
    created_at: new Date().toISOString(),
  };

  try {
    await req.catalyst.datastore().table("Machines").insertRow(row);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/machines/:machineId */
router.get("/:machineId", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Machines").getAllRows();
    const machine = rows.find((r) => r.machine_id === req.params.machineId);
    if (!machine) return res.status(404).json({ error: "Machine not found" });
    res.json(machine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/machines/:machineId */
router.patch("/:machineId", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Machines");
    const rows = await table.getAllRows();
    const machine = rows.find((r) => r.machine_id === req.params.machineId);
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const { name, type, teamId } = req.body || {};
    const updated = {
      ROWID: machine.ROWID,
      ...(name && { name }),
      ...(type && { type }),
      ...(teamId !== undefined && { team_id: teamId }),
    };

    await table.updateRow(updated);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/machines/:machineId */
router.delete("/:machineId", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Machines");
    const rows = await table.getAllRows();
    const machine = rows.find((r) => r.machine_id === req.params.machineId);
    if (!machine) return res.status(404).json({ error: "Machine not found" });
    await table.deleteRow(machine.ROWID);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/machines/:machineId/processes */
router.get("/:machineId/processes", async (req, res) => {
  // Processes are pushed by the agent and stored temporarily in Cache.
  // For now we return the last known process list from the DataStore.
  try {
    const cache = req.catalyst.cache();
    const segment = cache.segment("processes");
    const value = await segment.getValue(req.params.machineId).catch(() => null);
    if (!value) return res.json([]);
    res.json(JSON.parse(value.cache_value || "[]"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/machines/:machineId/processes/refresh */
router.post("/:machineId/processes/refresh", async (req, res) => {
  // Queue a command for the agent to refresh process list
  try {
    const table = req.catalyst.datastore().table("Installations");
    await table.insertRow({
      install_id: uuidv4(),
      machine_id: req.params.machineId,
      product_name: "__process_refresh__",
      status: "pending",
      started_at: new Date().toISOString(),
    });
    res.json({ ok: true, message: "Process refresh queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
