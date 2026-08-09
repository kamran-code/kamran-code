import crypto from "crypto";

// Password-protected dashboard. The password lives in DASHBOARD_PASSWORD (server
// env). On login we set an httpOnly cookie whose value is an HMAC derived from
// the password, so it can't be forged without knowing the password.

export const COOKIE_NAME = "esat_admin";

function password(): string | null {
  const p = process.env.DASHBOARD_PASSWORD;
  return p && p.length > 0 ? p : null;
}

export function dashboardEnabled(): boolean {
  return password() !== null;
}

/** The expected cookie value for an authenticated admin (null if not configured). */
export function sessionToken(): string | null {
  const p = password();
  if (!p) return null;
  return crypto.createHmac("sha256", p).update("esat-admin-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function verifyPassword(input: string): boolean {
  const p = password();
  return p !== null && typeof input === "string" && safeEqual(input, p);
}

export function verifyCookie(value: string | undefined | null): boolean {
  const t = sessionToken();
  return t !== null && typeof value === "string" && safeEqual(value, t);
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1) {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  return out;
}

/** True if the request carries a valid admin session cookie. */
export function isAdminRequest(request: Request): boolean {
  const cookies = parseCookies(request.headers.get("cookie"));
  return verifyCookie(cookies[COOKIE_NAME]);
}
