import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { AwsEmailOTP } from "./AwsEmailOTP";
import { TermiiOTP } from "./TermiiOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [AwsEmailOTP, Password, TermiiOTP],
});
