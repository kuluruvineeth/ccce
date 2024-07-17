import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  publicRoutes: (req) =>
    !req.url.includes("/dashboard") && !req.url.includes("/code"),
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
