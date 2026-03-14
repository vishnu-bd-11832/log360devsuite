/**
 * Log360 Dev Suite Agent — Main Entry Point
 *
 * Starts all agent subsystems and runs the main event loop:
 *  1. Register with the Catalyst backend
 *  2. Send heartbeats every N seconds
 *  3. Scan running processes every N seconds
 *  4. Detect ManageEngine products every N seconds
 *  5. Push log chunks every N seconds
 *  6. Poll for pending commands and execute them
 */

"use strict";

const os = require("os");
const config = require("./config");
const api = require("./lib/catalystClient");
const heartbeat = require("./lib/heartbeat");
const processMonitor = require("./lib/processMonitor");
const productDetector = require("./lib/productDetector");
const logReader = require("./lib/logReader");
const installer = require("./lib/installer");
const backupManager = require("./lib/backupManager");

// ── Simple logger ─────────────────────────────────────────────────────────────

const logger = {
  info: (...a) => console.log(new Date().toISOString(), "[INFO]", ...a),
  warn: (...a) => console.warn(new Date().toISOString(), "[WARN]", ...a),
  error: (...a) => console.error(new Date().toISOString(), "[ERROR]", ...a),
};

// ── Startup validation ────────────────────────────────────────────────────────

if (!config.agentToken) {
  logger.error("LOG360_AGENT_TOKEN is not set. Obtain a token from the Log360 Dev Suite portal.");
  logger.error("See the CATALYST_SETUP.md for instructions.");
  process.exit(1);
}

if (!config.apiUrl) {
  logger.error("LOG360_API_URL is not set.");
  process.exit(1);
}

// ── Cached state ──────────────────────────────────────────────────────────────

let lastProcessList = [];

// ── Registration ──────────────────────────────────────────────────────────────

async function register() {
  await api.register({
    machineId: config.machineId,
    hostname: config.hostname,
    os: config.os,
    platform: config.platform,
    agentVersion: config.version,
    ipAddress: getLocalIp(),
    capabilities: ["process-monitor", "product-detector", "installer", "log-reader", "backup"],
  });
  logger.info(`[agent] Registered as machine ${config.machineId} (${config.hostname})`);
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    const ipv4 = (iface || []).find((a) => a.family === "IPv4" && !a.internal);
    if (ipv4) return ipv4.address;
  }
  return "127.0.0.1";
}

// ── Command dispatcher ────────────────────────────────────────────────────────

async function dispatchCommand(cmd) {
  const { file_type: type } = cmd;

  if (type === "__product_scan__") {
    await productDetector.scanAndPush(lastProcessList, logger);
    await api.reportCommandResult(config.machineId, cmd.install_id, {
      status: "complete",
      logOutput: "Product scan complete",
    });
    return;
  }

  if (type === "__process_refresh__") {
    lastProcessList = await processMonitor.listProcesses();
    await api.pushProcessList(config.machineId, lastProcessList);
    await api.reportCommandResult(config.machineId, cmd.install_id, {
      status: "complete",
      logOutput: `${lastProcessList.length} processes found`,
    });
    return;
  }

  if (type && type.startsWith("__backup_")) {
    await backupManager.executeBackup(cmd, logger);
    return;
  }

  if (type === "__convert_mssql__") {
    await backupManager.executeMssqlConversion(cmd, logger);
    return;
  }

  if (type === "__workdrive_upload__") {
    // WorkDrive upload is handled via the Catalyst Function (server-side)
    await api.reportCommandResult(config.machineId, cmd.install_id, {
      status: "complete",
      logOutput: "WorkDrive upload delegated to Catalyst",
    });
    return;
  }

  if (type === "__service_start__" || type === "__service_stop__") {
    // Delegate to platform-specific service control
    const platform = require(`./platform/${config.os === "Windows" ? "windows" : "linux"}`);
    await platform.controlService(cmd.product_name, type === "__service_start__", logger);
    await api.reportCommandResult(config.machineId, cmd.install_id, {
      status: "complete",
      logOutput: `${type === "__service_start__" ? "Started" : "Stopped"} ${cmd.product_name}`,
    });
    return;
  }

  // Default: treat as installation task
  await installer.executeInstallation(cmd, logger);
}

async function pollAndExecuteCommands() {
  try {
    const commands = await api.getPendingCommands(config.machineId);
    if (!Array.isArray(commands) || commands.length === 0) return;

    for (const cmd of commands) {
      logger.info(`[agent] Dispatching command: ${cmd.install_id} (${cmd.file_type || "install"})`);
      dispatchCommand(cmd).catch((err) =>
        logger.error(`[agent] Command ${cmd.install_id} threw:`, err.message)
      );
    }
  } catch (err) {
    logger.warn("[agent] Poll failed:", err.message);
  }
}

async function periodicProductScan() {
  await productDetector.scanAndPush(lastProcessList, logger);
}

async function periodicProcessScan() {
  try {
    lastProcessList = await processMonitor.listProcesses();
    logger.info(`[agent] Process scan: ${lastProcessList.length} processes`);
  } catch (err) {
    logger.warn("[agent] Process scan failed:", err.message);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  logger.info("=".repeat(60));
  logger.info(" Log360 Dev Suite Agent v" + config.version);
  logger.info(" Machine ID : " + config.machineId);
  logger.info(" Hostname   : " + config.hostname);
  logger.info(" OS         : " + config.os);
  logger.info(" API URL    : " + config.apiUrl);
  logger.info("=".repeat(60));

  // 1. Register
  try {
    await register();
  } catch (err) {
    logger.error("[agent] Registration failed:", err.message);
    logger.error("[agent] Will retry in 30s...");
    await new Promise((r) => setTimeout(r, 30000));
    await register();
  }

  // 2. Initial scans
  await periodicProcessScan();
  await periodicProductScan();

  // 3. Start scheduled tasks
  heartbeat.start(logger);
  logReader.start(logger);

  setInterval(periodicProcessScan, config.processScanInterval);
  setInterval(periodicProductScan, config.productScanInterval);
  setInterval(pollAndExecuteCommands, config.pollInterval);

  // Run command poll immediately
  pollAndExecuteCommands();

  logger.info("[agent] All subsystems started. Agent is running.");
}

// Graceful shutdown
process.on("SIGINT", () => { logger.info("[agent] Shutting down..."); process.exit(0); });
process.on("SIGTERM", () => { logger.info("[agent] Shutting down..."); process.exit(0); });
process.on("uncaughtException", (err) => logger.error("[agent] Uncaught exception:", err));
process.on("unhandledRejection", (reason) => logger.warn("[agent] Unhandled rejection:", reason));

main().catch((err) => {
  logger.error("[agent] Fatal startup error:", err);
  process.exit(1);
});
