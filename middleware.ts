import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "session";

async function verifySignedCookie(signed: string): Promise<number | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "your-session-secret-here") return null;

  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;

  const value = signed.slice(0, lastDot);
  const providedSig = signed.slice(lastDot + 1);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const expectedSig = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (providedSig.length !== expectedSig.length) return null;

  let mismatch = 0;
  for (let i = 0; i < providedSig.length; i++) {
    mismatch |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  const userId = parseInt(value, 10);
  if (isNaN(userId)) return null;

  return userId;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/") ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/uploads/")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  const userId = sessionCookie ? await verifySignedCookie(sessionCookie.value) : null;

  if (!userId) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
