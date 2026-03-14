/**
 * Linux platform helpers — service control, process management.
 */

"use strict";

const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");

const LINUX_BASE_DIRS = ["/opt/manageengine", "/opt/ME", "/usr/local/manageengine"];

const SERVICE_SCRIPTS = {
  Log360: { start: "log360.sh start", stop: "log360.sh stop" },
  EventLogAnalyzer: { start: "ELA.sh start", stop: "ELA.sh stop" },
  ADAuditPlus: { start: "ADAuditPlus.sh start", stop: "ADAuditPlus.sh stop" },
  DataSecurityPlus: { start: "DSP.sh start", stop: "DSP.sh stop" },
  CloudSecurityPlus: { start: "CSP.sh start", stop: "CSP.sh stop" },
};

const PRODUCT_SUBDIRS = {
  Log360: "log360",
  EventLogAnalyzer: "eventloganalyzer",
  ADAuditPlus: "adauditplus",
  DataSecurityPlus: "datasecurityplus",
  CloudSecurityPlus: "cloudsecurityplus",
};

function findScriptPath(productKey, action) {
  const scripts = SERVICE_SCRIPTS[productKey] || {
    start: `${productKey.toLowerCase()}.sh start`,
    stop: `${productKey.toLowerCase()}.sh stop`,
  };
  const scriptParts = (action === "start" ? scripts.start : scripts.stop).split(" ");
  const scriptName = scriptParts[0];

  const subdir = PRODUCT_SUBDIRS[productKey] || productKey.toLowerCase();

  for (const base of LINUX_BASE_DIRS) {
    const candidate = path.join(base, subdir, "bin", scriptName);
    if (fs.existsSync(candidate)) return { script: candidate, args: scriptParts.slice(1) };
  }
  return null;
}

async function controlService(productKey, start, logger) {
  const action = start ? "start" : "stop";
  const found = findScriptPath(productKey, action);

  if (!found) {
    // Try systemctl as fallback
    const serviceName = `${productKey.toLowerCase()}`;
    logger.info(`[linux] Trying systemctl ${action} ${serviceName}`);
    return new Promise((resolve, reject) => {
      execFile("systemctl", [action, serviceName], { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
          logger.warn(`[linux] systemctl ${action} failed: ${stderr || err.message}`);
          return reject(err);
        }
        resolve(stdout);
      });
    });
  }

  fs.chmodSync(found.script, 0o755);

  return new Promise((resolve, reject) => {
    execFile("bash", [found.script, ...found.args], { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        logger.warn(`[linux] Service ${action} failed: ${stderr || err.message}`);
        return reject(err);
      }
      logger.info(`[linux] Service ${action} complete for ${productKey}`);
      resolve(stdout);
    });
  });
}

module.exports = { controlService };
