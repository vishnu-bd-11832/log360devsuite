/**
 * Auth middleware for Log360 Dev Suite Catalyst Function.
 *
 * verifyUserToken  — validates a Zoho access token and checks @zohocorp.com
 * verifyAgentToken — validates the long-lived agent token stored in DataStore
 */

"use strict";

const https = require("https");
const crypto = require("crypto");

const ZOHO_USER_INFO_URL = "https://accounts.zoho.in/oauth/user/info";
const REQUIRED_DOMAIN = "zohocorp.com";
const AGENT_TOKEN_SECRET = process.env.AGENT_TOKEN_SECRET || "";

if (!AGENT_TOKEN_SECRET) {
  // Refuse to start without a proper secret — a missing secret would allow any
  // attacker who knows the default to forge agent tokens.
  console.error(
    "[auth] FATAL: AGENT_TOKEN_SECRET environment variable is not set. " +
      "Set it to a random 256-bit hex string in the Catalyst Function environment variables."
  );
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = https.request(
      { hostname: opts.hostname, path: opts.pathname + opts.search, headers, method: "GET" },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}`));
          } else {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error("Invalid JSON from Zoho"));
            }
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function hashToken(token) {
  return crypto.createHmac("sha256", AGENT_TOKEN_SECRET).update(token).digest("hex");
}

// ── User token middleware ─────────────────────────────────────────────────────

async function verifyUserToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const userInfo = await httpsGet(ZOHO_USER_INFO_URL, {
      Authorization: `Zoho-oauthtoken ${token}`,
    });

    const email = (userInfo.Email || userInfo.email || "").toLowerCase();
    if (!email.endsWith(`@${REQUIRED_DOMAIN}`)) {
      return res.status(403).json({ error: "Access restricted to @zohocorp.com accounts" });
    }

    req.user = { email, ...userInfo };
    return next();
  } catch (err) {
    return res.status(401).json({ error: `Token verification failed: ${err.message}` });
  }
}

// ── Agent token middleware ────────────────────────────────────────────────────

async function verifyAgentToken(req, res, next) {
  const agentToken = req.headers["x-agent-token"] || "";

  if (!agentToken) {
    return res.status(401).json({ error: "Missing X-Agent-Token header" });
  }

  try {
    const tokenHash = hashToken(agentToken);
    const datastore = req.catalyst.datastore();
    const table = datastore.table("Agents");
    const result = await table
      .getAllRows()
      .then((rows) => rows.find((r) => r.token_hash === tokenHash));

    if (!result) {
      return res.status(401).json({ error: "Invalid agent token" });
    }

    req.agent = result;
    return next();
  } catch (err) {
    return res.status(401).json({ error: `Agent auth failed: ${err.message}` });
  }
}

// ── Helpers to expose ─────────────────────────────────────────────────────────

function generateAgentToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = { verifyUserToken, verifyAgentToken, hashToken, generateAgentToken };
