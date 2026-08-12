import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// App-wide access gate. The entire app (quiz included) is private: every route
// requires a valid admin session cookie, EXCEPT the login page and the
// login/logout endpoints. API routes may alternatively present the ingest
// Bearer token (so the content skill/API keeps working).
//
// This mirrors src/lib/auth.ts, but runs in the Edge runtime, so it uses Web
// Crypto (crypto.subtle) instead of node:crypto. If DASHBOARD_PASSWORD is not
// set, the gate is disabled (no lockout) — matching the dashboard's behavior.

const COOKIE_NAME = "esat_admin";

// Never gated — needed to authenticate in the first place.
const PUBLIC_PATHS = new Set<string>([
  "/dashboard/login",
  "/api/dashboard/login",
  "/api/dashboard/logout",
]);

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// HMAC-SHA256(password, "esat-admin-session-v1") — same derivation as auth.ts.
async function expectedToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("esat-admin-session-v1"),
  );
  return toHex(sig);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const password = process.env.DASHBOARD_PASSWORD;
  // Not configured → don't lock anyone out (dev / unconfigured server).
  if (!password) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    const expected = await expectedToken(password);
    if (cookie.length === expected.length && cookie === expected) {
      return NextResponse.next();
    }
  }

  // API: allow the ingest Bearer token (skill/API reads + writes); else 401.
  if (pathname.startsWith("/api/")) {
    const ingest = process.env.INGEST_TOKEN;
    const header = req.headers.get("authorization") || "";
    const provided = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : (req.headers.get("x-ingest-token") || "").trim();
    if (ingest && provided && provided === ingest) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pages: send to login, remembering where they were headed.
  const url = req.nextUrl.clone();
  url.pathname = "/dashboard/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
