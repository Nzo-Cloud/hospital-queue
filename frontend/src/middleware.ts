import { NextRequest, NextResponse } from "next/server";

// Role → allowed path prefixes
const ROLE_ROUTES: Record<string, string> = {
  patient: "/patient",
  receptionist: "/receptionist",
  doctor: "/doctor",
  admin: "/admin",
};

const PUBLIC_PATHS = ["/auth/login", "/auth/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Read auth state from cookie (access token presence check only;
  // actual JWT validation happens on the backend for every API call)
  const accessToken = request.cookies.get("accessToken")?.value;
  const userRole = request.cookies.get("userRole")?.value;

  // Not authenticated → redirect to login
  if (!accessToken || !userRole) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  const allowedPrefix = ROLE_ROUTES[userRole];
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    // Authenticated but wrong role — redirect to their dashboard
    return NextResponse.redirect(new URL(allowedPrefix, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - api routes (handled by backend)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
