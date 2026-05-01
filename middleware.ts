export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/projects/:path*",
    "/clips/:path*",
    "/settings/:path*",
    "/admin/:path*"
  ]
};
