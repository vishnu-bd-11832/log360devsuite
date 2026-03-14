/**
 * Log Reader — tails ManageEngine product log files and pushes chunks to Catalyst.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const config = require("../config");
const api = require("./catalystClient");

const IS_WINDOWS = process.platform === "win32";

// Known log file patterns per product
const LOG_PATHS = {
  Log360: IS_WINDOWS
    ? ["C:\\ManageEngine\\Log360\\logs\\log360.log",
       "C:\\Program Files\\ManageEngine\\Log360\\logs\\Log360.log"]
    : ["/opt/manageengine/log360/logs/log360.log"],

  EventLogAnalyzer: IS_WINDOWS
    ? ["C:\\ManageEngine\\EventLog Analyzer\\logs\\EventLogAnalyzer.log",
       "C:\\Program Files\\ManageEngine\\EventLog Analyzer\\logs\\EventLogAnalyzer.log"]
    : ["/opt/manageengine/eventloganalyzer/logs/EventLogAnalyzer.log"],

  ADAuditPlus: IS_WINDOWS
    ? ["C:\\ManageEngine\\ADAuditPlus\\logs\\ADAuditPlus.log"]
    : ["/opt/manageengine/adauditplus/logs/ADAuditPlus.log"],
};

// Track read positions per log file
const filePositions = {};

function tailFile(filePath, maxBytes = 65536) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const stat = fs.statSync(filePath);
    const pos = filePositions[filePath] || Math.max(0, stat.size - maxBytes);
    if (stat.size <= pos) return null; // no new content

    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(stat.size - pos);
    fs.readSync(fd, buf, 0, buf.length, pos);
    fs.closeSync(fd);

    filePositions[filePath] = stat.size;
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

async function pushLogs(logger) {
  for (const [productKey, paths] of Object.entries(LOG_PATHS)) {
    for (const logPath of paths) {
      const chunk = tailFile(logPath);
      if (!chunk) continue;

      logger.info(`[log-reader] Pushing ${chunk.length} bytes from ${productKey}`);
      await api.pushLogChunk(config.machineId, productKey, chunk).catch((err) =>
        logger.warn(`[log-reader] Push failed for ${productKey}: ${err.message}`)
      );
      break; // found the file for this product, move to next
    }
  }
}

function start(logger) {
  const interval = parseInt(process.env.LOG360_LOG_PUSH_MS || "5000", 10);
  logger.info(`[log-reader] Watching logs, pushing every ${interval / 1000}s`);
  return setInterval(() => pushLogs(logger).catch(() => {}), interval);
}

module.exports = { start, tailFile, pushLogs };
