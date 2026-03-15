/**
 * Windows platform helpers — service control, process management.
 */

"use strict";

const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");

const WIN_BASE_DIRS = [
  "C:\\ManageEngine",
  "C:\\Program Files\\ManageEngine",
  "D:\\ManageEngine",
];

const SERVICE_SCRIPTS = {
  Log360: { start: "startlog360.bat", stop: "stoplog360.bat" },
  EventLogAnalyzer: { start: "startELA.bat", stop: "stopELA.bat" },
  ADAuditPlus: { start: "startADAuditPlus.bat", stop: "stopADAuditPlus.bat" },
  DataSecurityPlus: { start: "startDSP.bat", stop: "stopDSP.bat" },
  CloudSecurityPlus: { start: "startCSP.bat", stop: "stopCSP.bat" },
  ExchangeReporterPlus: { start: "startERP.bat", stop: "stopERP.bat" },
};

function findScriptPath(productKey, action) {
  const scripts = SERVICE_SCRIPTS[productKey] || {
    start: `start${productKey}.bat`,
    stop: `stop${productKey}.bat`,
  };
  const scriptName = action === "start" ? scripts.start : scripts.stop;

  for (const base of WIN_BASE_DIRS) {
    const candidate = path.join(base, productKey, "bin", scriptName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function controlService(productKey, start, logger) {
  const action = start ? "start" : "stop";
  const scriptPath = findScriptPath(productKey, action);

  if (!scriptPath) {
    logger.warn(`[windows] No ${action} script found for ${productKey}`);
    return;
  }

  return new Promise((resolve, reject) => {
    execFile("cmd", ["/c", scriptPath], { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        logger.warn(`[windows] Service ${action} failed: ${stderr || err.message}`);
        return reject(err);
      }
      logger.info(`[windows] Service ${action} complete for ${productKey}: ${stdout.trim()}`);
      resolve(stdout);
    });
  });
}

module.exports = { controlService };
