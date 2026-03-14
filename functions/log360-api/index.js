/**
 * Log360 Dev Suite — Catalyst Advanced IO Cloud Function
 * Entry point: functions/log360-api/index.js
 *
 * Handles all /api/* routes for the web frontend and agents.
 * Data Centre: Indian DC (IN)
 */

"use strict";

const express = require("express");
const cors = require("cors");
const catalyst = require("zcatalyst-sdk-node");

// Route modules
const authRoutes = require("./routes/auth");
const agentRoutes = require("./routes/agents");
const machineRoutes = require("./routes/machines");
const productRoutes = require("./routes/products");
const installationRoutes = require("./routes/installations");
const buildRoutes = require("./routes/builds");
const connectorRoutes = require("./routes/connectors");
const backupRoutes = require("./routes/backups");
const teamRoutes = require("./routes/teams");
const domainRoutes = require("./routes/domain");

// Auth middleware
const { verifyUserToken, verifyAgentToken } = require("./middleware/auth");

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Agent-Token"],
  })
);

app.use(express.json({ limit: "10mb" }));

// Attach the Catalyst app instance to every request
app.use((req, _res, next) => {
  req.catalyst = catalyst.initialize(req);
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);

// User-authenticated routes
app.use("/api/agents", verifyUserToken, agentRoutes);
app.use("/api/machines", verifyUserToken, machineRoutes);
app.use("/api/teams", verifyUserToken, teamRoutes);
app.use("/api/installations", verifyUserToken, installationRoutes);
app.use("/api/builds", verifyUserToken, buildRoutes);
app.use("/api/connectors", verifyUserToken, connectorRoutes);
app.use("/api/backups", verifyUserToken, backupRoutes);

// Product & log routes live under /api/machines/:machineId — already protected above
app.use("/api/machines", verifyUserToken, productRoutes);

// Domain discovery and remote deployment
app.use("/api/domain", verifyUserToken, domainRoutes);

// Agent-authenticated routes (use separate token)
app.use("/api/agent", verifyAgentToken, agentRoutes);

// ── Health check ─────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "log360-api", dc: "IN", ts: new Date().toISOString() });
});

// ── Error handler ─────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[log360-api] Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

module.exports = app;
