/**
 * Log360 Dev Suite Agent — Catalyst API client
 *
 * Thin HTTP wrapper used by all agent modules to communicate with the
 * log360-api Catalyst Cloud Function.
 */

"use strict";

const fetch = require("node-fetch");
const config = require("../config");

async function request(method, path, body) {
  const url = `${config.apiUrl}${path}`;
  const headers = {
    "Content-Type": "application/json",
    "X-Agent-Token": config.agentToken,
  };

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${method} ${url} failed (HTTP ${res.status}): ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),

  // ── Specific agent API calls ──────────────────────────────────────────────

  register(info) {
    return api.post(`/agent/register`, info);
  },

  heartbeat(machineId, stats) {
    return api.post(`/agent/${machineId}/heartbeat`, stats);
  },

  getPendingCommands(machineId) {
    return api.get(`/agent/${machineId}/commands/pending`);
  },

  reportCommandResult(machineId, commandId, result) {
    return api.post(`/agent/${machineId}/commands/${commandId}/result`, result);
  },

  pushProcessList(machineId, processes) {
    return api.post(`/machines/${machineId}/processes`, { processes });
  },

  pushProductList(machineId, products) {
    // Products are pushed via heartbeat body for simplicity
    return api.post(`/agent/${machineId}/heartbeat`, { products });
  },

  pushLogChunk(machineId, product, chunk) {
    return api.post(`/machines/${machineId}/logs`, { product, chunk });
  },
};

module.exports = api;
