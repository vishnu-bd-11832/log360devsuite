"use strict";

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

/** GET /api/machines/:machineId/products */
router.get("/:machineId/products", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Products").getAllRows();
    res.json(rows.filter((r) => r.machine_id === req.params.machineId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/machines/:machineId/products/scan — queue a scan command */
router.post("/:machineId/products/scan", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Installations");
    await table.insertRow({
      install_id: uuidv4(),
      machine_id: req.params.machineId,
      product_name: "__product_scan__",
      status: "pending",
      started_at: new Date().toISOString(),
    });
    res.json({ ok: true, message: "Product scan queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/machines/:machineId/products/:productKey/start */
router.post("/:machineId/products/:productKey/start", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Installations");
    await table.insertRow({
      install_id: uuidv4(),
      machine_id: req.params.machineId,
      product_name: req.params.productKey,
      file_type: "__service_start__",
      status: "pending",
      started_at: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/machines/:machineId/products/:productKey/stop */
router.post("/:machineId/products/:productKey/stop", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Installations");
    await table.insertRow({
      install_id: uuidv4(),
      machine_id: req.params.machineId,
      product_name: req.params.productKey,
      file_type: "__service_stop__",
      status: "pending",
      started_at: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/machines/:machineId/logs */
router.get("/:machineId/logs", async (req, res) => {
  const { product, lines = 200 } = req.query;
  try {
    const cache = req.catalyst.cache();
    const segment = cache.segment("logs");
    const key = product ? `${req.params.machineId}:${product}` : req.params.machineId;
    const value = await segment.getValue(key).catch(() => null);
    if (!value) return res.json({ lines: [] });

    const allLines = (value.cache_value || "").split("\n");
    res.json({ lines: allLines.slice(-parseInt(lines, 10)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/machines/:machineId/logs — agent pushes log chunk */
router.post("/:machineId/logs", async (req, res) => {
  const { product, chunk } = req.body || {};
  if (!chunk) return res.status(400).json({ error: "chunk is required" });

  try {
    const cache = req.catalyst.cache();
    const segment = cache.segment("logs");
    const key = product ? `${req.params.machineId}:${product}` : req.params.machineId;

    // Append to existing cache value (keep last 5000 lines)
    const existing = await segment.getValue(key).catch(() => null);
    const existingLines = existing ? (existing.cache_value || "").split("\n") : [];
    const newLines = [...existingLines, ...chunk.split("\n")].slice(-5000).join("\n");

    await segment.put({
      cache_name: key,
      cache_value: newLines,
      expiry_in_hours: 24,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
