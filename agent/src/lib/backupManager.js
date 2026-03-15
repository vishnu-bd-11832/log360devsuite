/**
 * Backup Manager
 *
 * Handles:
 *  - Full / DB-only / config-only backup of ManageEngine products
 *  - DB conversion to MSSQL
 *  - Upload backup files to Zoho WorkDrive via the Catalyst API
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile, execFileSync } = require("child_process");
const config = require("../config");
const api = require("./catalystClient");

const IS_WINDOWS = process.platform === "win32";

// ── Backup directory per product ──────────────────────────────────────────────

function getProductHome(productKey) {
  const bases = IS_WINDOWS
    ? ["C:\\ManageEngine", "C:\\Program Files\\ManageEngine"]
    : ["/opt/manageengine", "/opt/ME"];

  const dirNames = {
    Log360: "Log360",
    EventLogAnalyzer: "EventLog Analyzer",
    ADAuditPlus: "ADAuditPlus",
    DataSecurityPlus: "DataSecurity Plus",
    CloudSecurityPlus: "Cloud Security Plus",
  };

  const subdir = dirNames[productKey] || productKey;
  for (const base of bases) {
    const p = path.join(base, subdir);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── Take a file-system backup (zip the product home) ─────────────────────────

function zipDirectory(srcDir, destFile) {
  return new Promise((resolve, reject) => {
    if (IS_WINDOWS) {
      // Use built-in PowerShell Compress-Archive
      execFile(
        "powershell",
        ["-Command", `Compress-Archive -Path '${srcDir}' -DestinationPath '${destFile}' -Force`],
        { timeout: 300000 },
        (err, stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message));
          resolve(destFile);
        }
      );
    } else {
      execFile(
        "tar",
        ["-czf", destFile, "-C", path.dirname(srcDir), path.basename(srcDir)],
        { timeout: 300000 },
        (err, _stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message));
          resolve(destFile);
        }
      );
    }
  });
}

// ── DB backup using the product's built-in backup script ─────────────────────

function runDbBackupScript(productHome) {
  const script = IS_WINDOWS
    ? path.join(productHome, "bin", "backupDB.bat")
    : path.join(productHome, "bin", "backupDB.sh");

  if (!fs.existsSync(script)) {
    throw new Error(`DB backup script not found: ${script}`);
  }

  return new Promise((resolve, reject) => {
    const cmd = IS_WINDOWS ? "cmd" : "bash";
    const args = IS_WINDOWS ? ["/c", script] : [script];
    execFile(cmd, args, { timeout: 600000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

// ── MSSQL migration script ────────────────────────────────────────────────────

function runMssqlConversion(productHome) {
  const script = IS_WINDOWS
    ? path.join(productHome, "tools", "migrate_to_mssql.bat")
    : path.join(productHome, "tools", "migrate_to_mssql.sh");

  if (!fs.existsSync(script)) {
    throw new Error(`MSSQL migration script not found: ${script}`);
  }

  return new Promise((resolve, reject) => {
    const cmd = IS_WINDOWS ? "cmd" : "bash";
    const args = IS_WINDOWS ? ["/c", script] : [script];
    execFile(cmd, args, { timeout: 1200000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

// ── Execute a backup command from the server ──────────────────────────────────

async function executeBackup(task, logger) {
  const { install_id: cmdId, machine_id: machineId, product_name: productKey, file_type: backupType } = task;

  const actualType = (backupType || "").replace("__backup_", "").replace("__", "");
  logger.info(`[backup] Starting ${actualType} backup for ${productKey}`);

  try {
    await api.reportCommandResult(machineId, cmdId, {
      status: "running",
      logOutput: `Starting ${actualType} backup...`,
    });

    const productHome = getProductHome(productKey);
    if (!productHome) throw new Error(`Product home not found for ${productKey}`);

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const tmpDir = os.tmpdir();
    let backupPath;

    if (actualType === "db") {
      logger.info("[backup] Running DB backup script");
      const log = await runDbBackupScript(productHome);
      // The script creates a backup file; try to find it
      const backupDir = path.join(productHome, "backup");
      const files = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];
      const latest = files.sort().pop();
      backupPath = latest ? path.join(backupDir, latest) : null;
      if (!backupPath) {
        throw new Error(
          `DB backup file not found in ${backupDir}. Script output:\n${log}`
        );
      }
    } else if (actualType === "config") {
      const confDir = path.join(productHome, "conf");
      backupPath = path.join(tmpDir, `${productKey}_conf_${ts}.${IS_WINDOWS ? "zip" : "tar.gz"}`);
      await zipDirectory(confDir, backupPath);
    } else {
      // full
      backupPath = path.join(tmpDir, `${productKey}_full_${ts}.${IS_WINDOWS ? "zip" : "tar.gz"}`);
      await zipDirectory(productHome, backupPath);
    }

    const sizeMb = fs.statSync(backupPath).size / 1024 / 1024;
    logger.info(`[backup] Backup created at ${backupPath} (${sizeMb.toFixed(1)} MB)`);

    await api.reportCommandResult(machineId, cmdId, {
      status: "complete",
      logOutput: `Backup created: ${backupPath} (${sizeMb.toFixed(1)} MB)`,
    });
  } catch (err) {
    logger.error("[backup] Failed:", err.message);
    await api.reportCommandResult(machineId, cmdId, {
      status: "failed",
      logOutput: err.message,
    }).catch(() => {});
  }
}

async function executeMssqlConversion(task, logger) {
  const { install_id: cmdId, machine_id: machineId, product_name: productKey } = task;

  logger.info(`[backup] Starting MSSQL conversion for ${productKey}`);
  try {
    await api.reportCommandResult(machineId, cmdId, {
      status: "running",
      logOutput: "Starting MSSQL conversion...",
    });

    const productHome = getProductHome(productKey);
    if (!productHome) throw new Error(`Product home not found for ${productKey}`);

    const log = await runMssqlConversion(productHome);
    await api.reportCommandResult(machineId, cmdId, {
      status: "complete",
      logOutput: log.slice(-4096),
    });
    logger.info("[backup] MSSQL conversion complete");
  } catch (err) {
    logger.error("[backup] MSSQL conversion failed:", err.message);
    await api.reportCommandResult(machineId, cmdId, {
      status: "failed",
      logOutput: err.message,
    }).catch(() => {});
  }
}

module.exports = { executeBackup, executeMssqlConversion };
