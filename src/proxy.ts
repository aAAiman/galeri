import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("galerikita_session");

  // Block probes for source code extraction, hidden files, and exploit scans
  const lowerPath = pathname.toLowerCase();
  if (
    lowerPath.includes(".git") ||
    lowerPath.includes(".env") ||
    lowerPath.endsWith(".map") ||
    lowerPath.endsWith(".sql") ||
    lowerPath.endsWith(".bak") ||
    lowerPath.includes("wp-admin") ||
    lowerPath.includes(".php")
  ) {
    return new NextResponse("Access Denied", { status: 403 });
  }

  // Allow Next.js static bundles, assets, favicon, and robots.txt
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // Allow login API endpoint
  if (pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  // If visiting /login and already has session cookie, redirect to /
  if (pathname === "/login") {
    if (sessionCookie?.value) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // If visiting protected pages without session cookie, redirect to /login
  if (!sessionCookie?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
