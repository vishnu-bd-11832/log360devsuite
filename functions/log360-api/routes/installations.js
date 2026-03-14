"use strict";

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

/** GET /api/installations */
router.get("/", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Installations").getAllRows();
    // Exclude internal command types
    const visible = rows.filter(
      (r) =>
        !r.product_name.startsWith("__") &&
        (req.query.machineId ? r.machine_id === req.query.machineId : true)
    );
    res.json(visible);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/installations */
router.post("/", async (req, res) => {
  const { machineId, productName, buildNumber, fileUrl, fileType, issPath } = req.body || {};
  if (!machineId || !productName) {
    return res.status(400).json({ error: "machineId and productName are required" });
  }

  const row = {
    install_id: uuidv4(),
    machine_id: machineId,
    product_name: productName,
    build_number: buildNumber || "",
    file_url: fileUrl || "",
    file_type: fileType || "exe",
    iss_path: issPath || "",
    status: "pending",
    log_output: "",
    started_at: new Date().toISOString(),
    completed_at: "",
  };

  try {
    await req.catalyst.datastore().table("Installations").insertRow(row);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/installations/:installId */
router.get("/:installId", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Installations").getAllRows();
    const task = rows.find((r) => r.install_id === req.params.installId);
    if (!task) return res.status(404).json({ error: "Not found" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/installations/:installId — cancel pending */
router.delete("/:installId", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Installations");
    const rows = await table.getAllRows();
    const task = rows.find((r) => r.install_id === req.params.installId);
    if (!task) return res.status(404).json({ error: "Not found" });
    if (task.status !== "pending") {
      return res.status(400).json({ error: "Only pending installations can be cancelled" });
    }
    await table.deleteRow(task.ROWID);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
