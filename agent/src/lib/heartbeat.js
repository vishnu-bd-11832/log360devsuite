/**
 * Heartbeat — periodically reports agent status, CPU, and memory to Catalyst.
 */

"use strict";

const os = require("os");
const config = require("../config");
const api = require("./catalystClient");

function getCpuPercent() {
  // Snapshot-based approximation: compare two readings 200 ms apart
  return new Promise((resolve) => {
    const start = os.cpus().map((c) => ({ ...c.times }));
    setTimeout(() => {
      const end = os.cpus();
      let idleDiff = 0;
      let totalDiff = 0;
      end.forEach((cpu, i) => {
        const s = start[i];
        const t = cpu.times;
        const idle = t.idle - s.idle;
        const total = Object.values(t).reduce((a, b) => a + b, 0) -
                      Object.values(s).reduce((a, b) => a + b, 0);
        idleDiff += idle;
        totalDiff += total;
      });
      resolve(totalDiff ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0);
    }, 200);
  });
}

function getMemoryPercent() {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round(((total - free) / total) * 100);
}

async function sendHeartbeat() {
  const cpu = await getCpuPercent();
  const memory = getMemoryPercent();
  await api.heartbeat(config.machineId, { cpu, memory, status: "Online" });
}

function start(logger) {
  logger.info(`[heartbeat] Sending heartbeat every ${config.heartbeatInterval / 1000}s`);

  // Send immediately on start
  sendHeartbeat().catch((err) => logger.warn("[heartbeat] Failed:", err.message));

  return setInterval(() => {
    sendHeartbeat().catch((err) => logger.warn("[heartbeat] Failed:", err.message));
  }, config.heartbeatInterval);
}

module.exports = { start, sendHeartbeat };
