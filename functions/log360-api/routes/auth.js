"use strict";

const express = require("express");
const router = express.Router();
const { hashToken, generateAgentToken } = require("../middleware/auth");

/**
 * POST /api/auth/verify
 * Verify a Zoho access token (already done by verifyUserToken middleware).
 * Returns a simple session confirmation.
 */
router.post("/verify", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(400).json({ error: "Missing token" });

  // Token already validated by middleware if route is protected, but this
  // endpoint is public so we do a minimal check here.
  res.json({ ok: true, message: "Token accepted" });
});

/**
 * POST /api/auth/agent-token
 * Issue a long-lived agent token for a machine.
 * Body: { machineId, hostname, os, platform }
 */
router.post("/agent-token", async (req, res) => {
  const { machineId, hostname, os, platform } = req.body || {};
  if (!machineId || !hostname) {
    return res.status(400).json({ error: "machineId and hostname are required" });
  }

  const token = generateAgentToken();
  const tokenHash = hashToken(token);

  try {
    const datastore = req.catalyst.datastore();
    const table = datastore.table("Agents");

    // Upsert: check if agent already exists
    const existing = await table
      .getAllRows()
      .then((rows) => rows.find((r) => r.machine_id === machineId));

    const row = {
      machine_id: machineId,
      hostname,
      os: os || "unknown",
      platform: platform || "x64",
      agent_version: "0.0.0",
      status: "pending",
      token_hash: tokenHash,
      owner_email: req.user.email,
      capabilities: JSON.stringify([]),
    };

    if (existing) {
      await table.updateRow({ ...row, ROWID: existing.ROWID });
    } else {
      await table.insertRow(row);
    }

    res.json({ token, machineId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
