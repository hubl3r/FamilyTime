// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVerificationEmail } from "@/lib/email";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
        name:     { label: "Name",     type: "text"     },
        action:   { label: "Action",   type: "text"     },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();

        if (credentials.action === "register") {
          // Check if already exists
          const { data: existing } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", email)
            .single();
          if (existing) throw new Error("Email already registered");

          // Hash and store
          const hashed = await bcrypt.hash(credentials.password, 10);
          const name = credentials.name || email.split("@")[0];
          const verify_token = crypto.randomBytes(32).toString("hex");
          const { data: user, error } = await supabaseAdmin
            .from("users")
            .insert({ email, password: hashed, name, verify_token, email_verified: false })
            .select()
            .single();
          if (error || !user) throw new Error("Failed to create account");

          // Send verification email (non-blocking)
          try {
            await sendVerificationEmail({ to: email, name, verifyToken: verify_token });
          } catch (emailErr) {
            console.error("[VERIFY] Email failed:", emailErr);
          }

          return { id: user.id, email: user.email, name: user.name };

        } else {
          // Login
          const { data: user } = await supabaseAdmin
            .from("users")
            .select("id, email, name, password")
            .eq("email", email)
            .single();
          if (!user) throw new Error("No account found");

          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) throw new Error("Incorrect password");

          // Link this user to their family_members row if not already linked,
          // and mark invite as accepted
          await supabaseAdmin
            .from("family_members")
            .update({
              nextauth_user_id: user.id,
              invite_status: "accepted",
              joined_at: new Date().toISOString(),
            })
            .eq("email", email)
            .is("nextauth_user_id", null); // only update if not already linked

          return { id: user.id, email: user.email, name: user.name };
        }
      },
    }),
  ],
  pages:   { signIn: "/sign-in" },
  session: { strategy: "jwt" },
  secret:  process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };