import NextAuth from "next-auth";
import { authConfig } from "@/auth/auth.config";

// Edge-safe instance (no token-refresh logic) used only to gate routes.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }
});

// Protect the authed app segments; the public landing and auth routes stay open.
// requireHouseholdSession() in Server Actions is the authoritative gate.
export const config = {
  matcher: ["/setup/:path*", "/recipes/:path*", "/plan/:path*", "/shopping/:path*"],
};
