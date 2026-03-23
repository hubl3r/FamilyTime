// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVerificationEmail } from "@/lib/email";
import { validatePassword } from "@/lib/validatePassword";
import { createPersonalFamily } from "@/lib/createPersonalFamily";

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
          // Validate password strength
          const { valid, errors } = validatePassword(credentials.password);
          if (!valid) throw new Error(errors[0]);

          // Check if already exists
          const { data: existing } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (existing) throw new Error("EMAIL_EXISTS");

          const hashed = await bcrypt.hash(credentials.password, 10);
          const name = credentials.name?.trim() || email.split("@")[0];
          const verify_token = crypto.randomBytes(32).toString("hex");

          const { data: user, error } = await supabaseAdmin
            .from("users")
            .insert({ email, password: hashed, name, verify_token, email_verified: false })
            .select()
            .single();
          if (error || !user) throw new Error("Failed to create account");

          // Create personal family
          const nameParts = name.trim().split(" ");
          const firstName = nameParts[0] ?? name;
          const lastName  = nameParts.slice(1).join(" ") || firstName;
          await createPersonalFamily({ userId: user.id, email, firstName, lastName });

          // Link any pending family_members rows that were created via invite
          await supabaseAdmin
            .from("family_members")
            .update({ nextauth_user_id: user.id, invite_status: "accepted", joined_at: new Date().toISOString() })
            .eq("email", email)
            .is("nextauth_user_id", null);

          try {
            await sendVerificationEmail({ to: email, name, verifyToken: verify_token });
          } catch (e) { console.error("[VERIFY] Email failed:", e); }

          return { id: user.id, email: user.email, name: user.name };

        } else {
          // Login — look up by email, validate password
          const { data: user } = await supabaseAdmin
            .from("users")
            .select("id, email, name, password, email_verified")
            .eq("email", email)
            .maybeSingle();
          if (!user) throw new Error("No account found with that email");

          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) throw new Error("Incorrect password");

          // Block login until email is verified
          if (!user.email_verified) throw new Error("EMAIL_NOT_VERIFIED");

          // Link any unlinked family_members rows (e.g. invited before registering)
          await supabaseAdmin
            .from("family_members")
            .update({ nextauth_user_id: user.id, invite_status: "accepted", joined_at: new Date().toISOString() })
            .eq("email", email)
            .is("nextauth_user_id", null);

          // Ensure they have a personal family
          const { data: personalCheck } = await supabaseAdmin
            .from("families")
            .select("id")
            .eq("owner_email", email)
            .eq("is_personal", true)
            .maybeSingle();

          if (!personalCheck) {
            // Get their name from family_members if available
            const { data: memberRow } = await supabaseAdmin
              .from("family_members")
              .select("first_name, last_name")
              .eq("nextauth_user_id", user.id)
              .maybeSingle();
            const firstName = memberRow?.first_name ?? user.name?.split(" ")[0] ?? "User";
            const lastName  = memberRow?.last_name  ?? user.name?.split(" ").slice(1).join(" ") ?? firstName;
            await createPersonalFamily({ userId: user.id, email, firstName, lastName });
          }

          return { id: user.id, email: user.email, name: user.name };
        }
      },
    }),
  ],
  callbacks: {
    // Store user.id in the JWT so we can use it server-side
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId) (session.user as { id?: string }).id = token.userId as string;
      return session;
    },
  },
  pages:  { signIn: "/sign-in" },
  session: { strategy: "jwt" },
  secret:  process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
