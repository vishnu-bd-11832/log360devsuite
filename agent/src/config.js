/**
 * Log360 Dev Suite Agent — Configuration
 *
 * Values are read from environment variables, which take precedence over
 * the defaults. On Windows the agent installer writes a .env file in its
 * install directory; on Linux it creates /etc/log360-agent/agent.conf.
 */

"use strict";

const os = require("os");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// ── Determine config file path ────────────────────────────────────────────────

const CONFIG_FILE =
  process.platform === "win32"
    ? path.join(process.env.PROGRAMDATA || "C:\\ProgramData", "Log360Agent", "agent.json")
    : "/etc/log360-agent/agent.json";

function readConfigFile() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    }
  } catch {
    // ignore
  }
  return {};
}

function writeConfigFile(config) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[config] Could not write config file:", err.message);
  }
}

// ── Load + merge config ───────────────────────────────────────────────────────

const fileConfig = readConfigFile();

const resolvedApiUrl = process.env.LOG360_API_URL || fileConfig.apiUrl || "";

// Warn if using an insecure URL in a non-localhost context
if (resolvedApiUrl && !resolvedApiUrl.startsWith("https://") && !resolvedApiUrl.startsWith("http://localhost") && !resolvedApiUrl.startsWith("http://127.0.0.1")) {
  // eslint-disable-next-line no-console
  console.warn(
    "[config] WARNING: LOG360_API_URL does not use HTTPS. " +
      "All agent communication will be unencrypted. Use HTTPS in production."
  );
}

const config = {
  // Catalyst API base URL (required — set via LOG360_API_URL or config file)
  apiUrl: resolvedApiUrl || "http://localhost:3001/api",

  // Agent authentication token (issued by /api/auth/agent-token)
  agentToken: process.env.LOG360_AGENT_TOKEN || fileConfig.agentToken || "",

  // Stable machine identifier (generated once, persisted to config file)
  machineId: process.env.LOG360_MACHINE_ID || fileConfig.machineId || (() => {
    const id = uuidv4();
    writeConfigFile({ ...fileConfig, machineId: id });
    return id;
  })(),

  // How often the agent sends a heartbeat (ms)
  heartbeatInterval: parseInt(process.env.LOG360_HEARTBEAT_MS || "15000", 10),

  // How often the agent polls for pending commands (ms)
  pollInterval: parseInt(process.env.LOG360_POLL_MS || "10000", 10),

  // How often the agent scans processes (ms)
  processScanInterval: parseInt(process.env.LOG360_PROCESS_SCAN_MS || "30000", 10),

  // How often the agent scans for ME products (ms)
  productScanInterval: parseInt(process.env.LOG360_PRODUCT_SCAN_MS || "120000", 10),

  // Agent version
  version: "1.0.0",

  // Runtime info
  hostname: os.hostname(),
  platform: os.arch(),
  os: process.platform === "win32" ? "Windows" : "Linux",
};

module.exports = config;
module.exports.writeConfigFile = writeConfigFile;
module.exports.readConfigFile = readConfigFile;
module.exports.CONFIG_FILE = CONFIG_FILE;
