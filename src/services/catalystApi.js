/**
 * Catalyst API client for the Log360 Dev Suite React SPA.
 *
 * Base URL: REACT_APP_CATALYST_API_URL (set in .env / Catalyst environment variables).
 * Authentication: Zoho access token forwarded as `Authorization: Bearer <token>`.
 *
 * Usage:
 *   import { catalystApi } from "services/catalystApi";
 *   const result = await catalystApi.post("/domain/discover", body, token);
 */

const BASE = (process.env.REACT_APP_CATALYST_API_URL || "/api").replace(/\/$/, "");

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      errMsg = json.error || json.message || errMsg;
    } catch {
      // ignore parse failure
    }
    throw new Error(errMsg);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

export const catalystApi = {
  get:    (path, token)       => request("GET",    path, undefined, token),
  post:   (path, body, token) => request("POST",   path, body,      token),
  patch:  (path, body, token) => request("PATCH",  path, body,      token),
  put:    (path, body, token) => request("PUT",    path, body,      token),
  delete: (path, token)       => request("DELETE", path, undefined, token),
};
