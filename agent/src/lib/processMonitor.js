/**
 * Process Monitor — lists currently running processes on the host machine.
 *
 * Windows: uses `tasklist /FO CSV /NH`
 * Linux:   uses `ps aux --no-headers`
 */

"use strict";

const { execFile } = require("child_process");
const config = require("../config");
const api = require("./catalystClient");

const IS_WINDOWS = process.platform === "win32";

function parseWindowsProcessList(csv) {
  return csv
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      // Format: "Image Name","PID","Session Name","Session#","Mem Usage"
      const parts = line.split('","').map((p) => p.replace(/^"|"$/g, "").trim());
      return {
        name: parts[0] || "",
        pid: parseInt(parts[1] || "0", 10),
        sessionName: parts[2] || "",
        memKb: parseInt((parts[4] || "0").replace(/[^0-9]/g, ""), 10),
      };
    })
    .filter((p) => p.name);
}

function parseLinuxProcessList(text) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cols = line.trim().split(/\s+/);
      // USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
      return {
        user: cols[0] || "",
        pid: parseInt(cols[1] || "0", 10),
        cpuPercent: parseFloat(cols[2] || "0"),
        memPercent: parseFloat(cols[3] || "0"),
        name: cols.slice(10).join(" ") || "",
      };
    })
    .filter((p) => p.pid);
}

function listProcesses() {
  return new Promise((resolve, reject) => {
    if (IS_WINDOWS) {
      execFile("tasklist", ["/FO", "CSV", "/NH"], { timeout: 10000 }, (err, stdout) => {
        if (err) return reject(err);
        resolve(parseWindowsProcessList(stdout));
      });
    } else {
      execFile("ps", ["aux", "--no-headers"], { timeout: 10000 }, (err, stdout) => {
        if (err) return reject(err);
        resolve(parseLinuxProcessList(stdout));
      });
    }
  });
}

async function scanAndPush(logger) {
  try {
    const processes = await listProcesses();
    logger.info(`[process-monitor] Found ${processes.length} processes`);
    await api.pushProcessList(config.machineId, processes);
  } catch (err) {
    logger.warn("[process-monitor] Scan failed:", err.message);
  }
}

function start(logger) {
  logger.info(
    `[process-monitor] Scanning every ${config.processScanInterval / 1000}s`
  );

  scanAndPush(logger);

  return setInterval(() => scanAndPush(logger), config.processScanInterval);
}

module.exports = { start, listProcesses, scanAndPush };
