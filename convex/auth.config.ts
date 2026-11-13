import type { AuthConfig } from "convex/server";

// Clerk's Convex integration issues session tokens with `aud: "convex"`.
// CLERK_JWT_ISSUER_DOMAIN is set on the deployment: `npx convex env set ...`
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
