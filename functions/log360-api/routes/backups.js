"use strict";

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

/** GET /api/backups */
router.get("/", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Backups").getAllRows();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/backups — trigger backup */
router.post("/", async (req, res) => {
  const { machineId, productName, type } = req.body || {};
  if (!machineId || !productName) {
    return res.status(400).json({ error: "machineId and productName are required" });
  }

  const row = {
    backup_id: uuidv4(),
    machine_id: machineId,
    product_name: productName,
    type: type || "full",
    size_mb: "0",
    local_path: "",
    workdrive_url: "",
    status: "pending",
    created_at: new Date().toISOString(),
  };

  try {
    await req.catalyst.datastore().table("Backups").insertRow(row);
    // Queue as a command for the agent (re-use Installations table for commands)
    await req.catalyst.datastore().table("Installations").insertRow({
      install_id: uuidv4(),
      machine_id: machineId,
      product_name: productName,
      file_type: `__backup_${type || "full"}__`,
      build_number: row.backup_id,
      status: "pending",
      started_at: new Date().toISOString(),
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/backups/:backupId */
router.get("/:backupId", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Backups").getAllRows();
    const backup = rows.find((r) => r.backup_id === req.params.backupId);
    if (!backup) return res.status(404).json({ error: "Backup not found" });
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/backups/:backupId/upload-workdrive */
router.post("/:backupId/upload-workdrive", async (req, res) => {
  // Queue upload command for agent
  try {
    const table = req.catalyst.datastore().table("Backups");
    const rows = await table.getAllRows();
    const backup = rows.find((r) => r.backup_id === req.params.backupId);
    if (!backup) return res.status(404).json({ error: "Backup not found" });

    await req.catalyst.datastore().table("Installations").insertRow({
      install_id: uuidv4(),
      machine_id: backup.machine_id,
      product_name: backup.product_name,
      file_type: "__workdrive_upload__",
      build_number: backup.backup_id,
      status: "pending",
      started_at: new Date().toISOString(),
    });

    res.json({ ok: true, message: "WorkDrive upload queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/backups/:backupId/convert-mssql */
router.post("/:backupId/convert-mssql", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Backups");
    const rows = await table.getAllRows();
    const backup = rows.find((r) => r.backup_id === req.params.backupId);
    if (!backup) return res.status(404).json({ error: "Backup not found" });

    await req.catalyst.datastore().table("Installations").insertRow({
      install_id: uuidv4(),
      machine_id: backup.machine_id,
      product_name: backup.product_name,
      file_type: "__convert_mssql__",
      build_number: backup.backup_id,
      status: "pending",
      started_at: new Date().toISOString(),
    });

    res.json({ ok: true, message: "MSSQL conversion queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
