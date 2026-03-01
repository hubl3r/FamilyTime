// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// In-memory store — swap for Supabase later
const users: { id: string; email: string; password: string; name: string }[] = [];

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
        if (credentials.action === "register") {
          const exists = users.find(u => u.email === credentials.email);
          if (exists) throw new Error("Email already registered");
          const hashed = await bcrypt.hash(credentials.password, 10);
          const user = {
            id: Date.now().toString(),
            email: credentials.email,
            password: hashed,
            name: credentials.name || credentials.email.split("@")[0],
          };
          users.push(user);
          return { id: user.id, email: user.email, name: user.name };
        } else {
          const user = users.find(u => u.email === credentials.email);
          if (!user) throw new Error("No account found");
          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) throw new Error("Incorrect password");
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