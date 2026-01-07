import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    // Protect all routes except auth and api/auth
    "/((?!api/auth|login|register|share|_next/static|_next/image|favicon.ico).*)",
  ],
};
