"use strict";

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

/** GET /api/builds */
router.get("/", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Builds").getAllRows();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/builds */
router.post("/", async (req, res) => {
  const { productName, buildNumber, downloadUrl, fileType, platform, connectorId, issPath } =
    req.body || {};
  if (!productName || !buildNumber) {
    return res.status(400).json({ error: "productName and buildNumber are required" });
  }

  const row = {
    build_id: uuidv4(),
    product_name: productName,
    build_number: buildNumber,
    download_url: downloadUrl || "",
    file_type: fileType || "exe",
    platform: platform || "windows",
    connector_id: connectorId || "",
    iss_path: issPath || "",
    is_active: "true",
    created_at: new Date().toISOString(),
  };

  try {
    await req.catalyst.datastore().table("Builds").insertRow(row);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/builds/:buildId */
router.put("/:buildId", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Builds");
    const rows = await table.getAllRows();
    const build = rows.find((r) => r.build_id === req.params.buildId);
    if (!build) return res.status(404).json({ error: "Build not found" });

    const updated = { ROWID: build.ROWID };
    const fields = [
      "product_name",
      "build_number",
      "download_url",
      "file_type",
      "platform",
      "connector_id",
      "iss_path",
      "is_active",
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) updated[f] = req.body[f];
    });

    await table.updateRow(updated);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/builds/:buildId */
router.delete("/:buildId", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Builds");
    const rows = await table.getAllRows();
    const build = rows.find((r) => r.build_id === req.params.buildId);
    if (!build) return res.status(404).json({ error: "Build not found" });
    await table.deleteRow(build.ROWID);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/builds/import — bulk import from JSON array */
router.post("/import", async (req, res) => {
  const builds = Array.isArray(req.body) ? req.body : req.body.builds;
  if (!Array.isArray(builds) || builds.length === 0) {
    return res.status(400).json({ error: "Provide an array of build objects" });
  }

  try {
    const table = req.catalyst.datastore().table("Builds");
    const now = new Date().toISOString();
    const inserted = [];
    for (const b of builds) {
      const row = {
        build_id: uuidv4(),
        product_name: b.productName || b.product_name || "",
        build_number: b.buildNumber || b.build_number || "",
        download_url: b.downloadUrl || b.download_url || "",
        file_type: b.fileType || b.file_type || "exe",
        platform: b.platform || "windows",
        connector_id: b.connectorId || b.connector_id || "",
        iss_path: b.issPath || b.iss_path || "",
        is_active: "true",
        created_at: now,
      };
      await table.insertRow(row);
      inserted.push(row);
    }
    res.json({ imported: inserted.length, builds: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/builds/export */
router.get("/export", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Builds").getAllRows();
    res.setHeader("Content-Disposition", "attachment; filename=builds.json");
    res.setHeader("Content-Type", "application/json");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
