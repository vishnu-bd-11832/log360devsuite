/**
 * Zoho OAuth service for Log360 Dev Suite.
 *
 * Access is restricted to members of wsm-info@zohocorp.com.
 *
 * Flow (implicit grant — SPA-friendly, no client secret required):
 *  1. Call initiateZohoLogin() → redirects to Zoho accounts
 *  2. Zoho redirects back to /authentication/callback#access_token=...
 *  3. Callback page calls parseHashToken(), fetchZohoUserInfo(), isAuthorizedUser()
 *  4. On success, call saveSession(); on failure show Access Denied
 *
 * Required environment variables (see .env.example):
 *  REACT_APP_ZOHO_CLIENT_ID       — OAuth client ID from Zoho API Console
 *  REACT_APP_ZOHO_REDIRECT_URI    — must match the URI registered in Zoho API Console
 *  REACT_APP_ALLOWED_EMAILS       — (optional) comma-separated list of allowed emails.
 *                                   If omitted, all @zohocorp.com users are allowed.
 *                                   Set this to enforce the wsm-info group allowlist.
 *
 * NOTE: For stronger group-membership enforcement, validate the email against the
 * Zoho Directory API from a Catalyst cloud function and return a signed session
 * token to the frontend instead of trusting the client-side check alone.
 */

const CLIENT_ID = process.env.REACT_APP_ZOHO_CLIENT_ID || "";

const REDIRECT_URI =
  process.env.REACT_APP_ZOHO_REDIRECT_URI ||
  (typeof window !== "undefined" ? `${window.location.origin}/authentication/callback` : "");

const ZOHO_ACCOUNTS_BASE = "https://accounts.zoho.com";
const REQUIRED_DOMAIN = "zohocorp.com";

// Comma-separated allowlist — populate with wsm-info@zohocorp.com members.
const ALLOWED_EMAILS_RAW = process.env.REACT_APP_ALLOWED_EMAILS || "";

/**
 * Build the Zoho OAuth authorization URL and redirect the browser.
 * Uses the implicit grant (response_type=token) — no server-side token
 * exchange required, suitable for a pure SPA on Zoho Catalyst.
 */
export const initiateZohoLogin = () => {
  if (!CLIENT_ID) {
    // eslint-disable-next-line no-console
    console.error(
      "Log360 Dev Suite: REACT_APP_ZOHO_CLIENT_ID is not configured. " +
        "Create a .env file — see .env.example."
    );
    return;
  }

  const params = new URLSearchParams({
    response_type: "token",
    client_id: CLIENT_ID,
    scope: "AaaServer.profile.Read",
    redirect_uri: REDIRECT_URI,
    access_type: "online",
    prompt: "consent",
  });

  window.location.href = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/auth?${params.toString()}`;
};

/**
 * Parse the URL hash fragment that Zoho appends after a successful implicit grant.
 * Example hash: #access_token=TOKEN&token_type=Bearer&expires_in=3600
 *
 * @param {string} hash  window.location.hash value
 * @returns {{ accessToken, tokenType, expiresIn, error, errorDescription }}
 */
export const parseHashToken = (hash) => {
  const cleaned = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(cleaned);
  return {
    accessToken: params.get("access_token") || "",
    tokenType: params.get("token_type") || "",
    expiresIn: parseInt(params.get("expires_in") || "3600", 10),
    error: params.get("error") || "",
    errorDescription: params.get("error_description") || "",
  };
};

/**
 * Fetch the authenticated user's profile from Zoho Accounts.
 * Returns an object that includes at minimum: Email, First_Name, Last_Name, Display_Name.
 *
 * @param {string} accessToken
 * @returns {Promise<object>}
 */
export const fetchZohoUserInfo = async (accessToken) => {
  const res = await fetch(`${ZOHO_ACCOUNTS_BASE}/oauth/user/info`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Zoho user-info request failed (HTTP ${res.status})`);
  }
  return res.json();
};

/**
 * Determine whether a given email is authorised to use Log360 Dev Suite.
 *
 * Rules (both must pass):
 *  1. Email domain must be @zohocorp.com
 *  2. If REACT_APP_ALLOWED_EMAILS is set, the email must appear in that list
 *     (this enforces the wsm-info@zohocorp.com membership restriction).
 *
 * @param {string} email
 * @returns {boolean}
 */
export const isAuthorizedUser = (email) => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();

  if (!normalized.endsWith(`@${REQUIRED_DOMAIN}`)) return false;

  if (ALLOWED_EMAILS_RAW.trim()) {
    const allowList = ALLOWED_EMAILS_RAW.split(",").map((e) => e.trim().toLowerCase());
    return allowList.includes(normalized);
  }

  // No allowlist configured — any @zohocorp.com address is permitted.
  // In production, populate REACT_APP_ALLOWED_EMAILS with the wsm-info roster.
  return true;
};

// ─── Session helpers (sessionStorage — cleared when the tab/browser closes) ──

const SESSION_KEY = "log360_ds_auth";

/**
 * Persist the authenticated session.
 * @param {object} user       Zoho user-info payload
 * @param {string} token      Access token
 * @param {number} expiresIn  Token lifetime in seconds
 */
export const saveSession = (user, token, expiresIn) => {
  const expiresAt = Date.now() + expiresIn * 1000;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, token, expiresAt }));
};

/**
 * Load a previously saved session, or return null if absent / expired.
 * @returns {{ user, token, expiresAt } | null}
 */
export const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() >= data.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

/** Remove the current session (sign-out). */
export const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};
