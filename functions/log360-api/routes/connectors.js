"use strict";

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

/** GET /api/connectors */
router.get("/", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Connectors").getAllRows();
    // Mask auth headers before returning
    res.json(rows.map((r) => ({ ...r, auth_header: r.auth_header ? "***" : "" })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/connectors */
router.post("/", async (req, res) => {
  const { name, type, baseUrl, authHeader } = req.body || {};
  if (!name || !baseUrl) return res.status(400).json({ error: "name and baseUrl are required" });

  const row = {
    connector_id: uuidv4(),
    name,
    type: type || "http",
    base_url: baseUrl,
    auth_header: authHeader || "",
    is_active: "true",
    created_at: new Date().toISOString(),
  };

  try {
    await req.catalyst.datastore().table("Connectors").insertRow(row);
    res.status(201).json({ ...row, auth_header: row.auth_header ? "***" : "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/connectors/:connectorId */
router.put("/:connectorId", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Connectors");
    const rows = await table.getAllRows();
    const conn = rows.find((r) => r.connector_id === req.params.connectorId);
    if (!conn) return res.status(404).json({ error: "Connector not found" });

    const updated = { ROWID: conn.ROWID };
    ["name", "type", "base_url", "auth_header", "is_active"].forEach((f) => {
      if (req.body[f] !== undefined) updated[f] = req.body[f];
    });
    await table.updateRow(updated);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/connectors/:connectorId */
router.delete("/:connectorId", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Connectors");
    const rows = await table.getAllRows();
    const conn = rows.find((r) => r.connector_id === req.params.connectorId);
    if (!conn) return res.status(404).json({ error: "Connector not found" });
    await table.deleteRow(conn.ROWID);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/connectors/:connectorId/test */
router.post("/:connectorId/test", async (req, res) => {
  try {
    const table = req.catalyst.datastore().table("Connectors");
    const rows = await table.getAllRows();
    const conn = rows.find((r) => r.connector_id === req.params.connectorId);
    if (!conn) return res.status(404).json({ error: "Connector not found" });

    // Simple HTTP HEAD to base_url
    const https = require("https");
    const http = require("http");
    const url = new URL(conn.base_url);
    const client = url.protocol === "https:" ? https : http;

    await new Promise((resolve, reject) => {
      const reqHttp = client.request({ hostname: url.hostname, path: url.pathname, method: "HEAD" }, (r) => {
        resolve(r.statusCode);
      });
      reqHttp.on("error", reject);
      reqHttp.setTimeout(5000, () => {
        reqHttp.destroy();
        reject(new Error(`Connection to ${conn.base_url} timed out after 5 s`));
      });
      reqHttp.end();
    });

    res.json({ ok: true, message: "Connector is reachable" });
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message });
  }
});

module.exports = router;
