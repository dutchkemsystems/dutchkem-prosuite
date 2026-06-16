import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { AwsEmailOTP } from "./AwsEmailOTP";
import { TermiiOTP } from "./TermiiOTP";

// Google provider built as a FLAT object (not using Google() helper)
// This ensures authorization/token/userinfo are at the TOP level
// so oAuthConfigToInternalProvider skips OIDC discovery
const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const googleProvider = hasGoogle ? {
  id: "google",
  name: "Google",
  type: "oidc" as const,
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  issuer: "https://accounts.google.com",
  checks: ["pkce"] as ("pkce" | "state" | "nonce")[],
  authorization: {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    params: {
      scope: "openid email profile",
      prompt: "consent",
      access_type: "offline",
      response_type: "code",
    },
  },
  token: {
    url: "https://oauth2.googleapis.com/token",
  },
  userinfo: {
    url: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  profile: (profile: any) => ({
    id: profile.sub,
    name: profile.name,
    email: profile.email,
    image: profile.picture,
    emailVerified: profile.email_verified,
  }),
  style: { brandColor: "#1a73e8" },
} : null;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    AwsEmailOTP,
    Password,
    TermiiOTP,
    ...(googleProvider ? [googleProvider] : []),
  ],
});
