import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/dashboard/creator") && role !== "CREATOR") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (path.startsWith("/dashboard/fan") && role !== "FAN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (path.startsWith("/admin") && role !== "MODERATOR" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/messages/:path*"],
};
