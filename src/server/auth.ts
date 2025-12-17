/**
 * NextAuth 5.0 Configuration
 *
 * Implements email/password authentication with bcrypt hashing.
 * Includes session management and user data enrichment.
 */

import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

/**
 * Module augmentation for next-auth types
 * Extends the default session to include our custom fields
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name?: string | null;
      isConsultancy: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/onboarding',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Find user by email
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            consultancyAccess: true,
          },
        });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }

        // Return user object for session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;

        // Check consultancy access
        const consultancyAccess = await db.consultancyAccess.findUnique({
          where: { userId: user.id },
        });

        token.isConsultancy = !!consultancyAccess?.canAccessAllOrgs;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.isConsultancy = token.isConsultancy as boolean;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
    async signOut() {
      console.log('User signed out');
    },
  },
  debug: process.env.NODE_ENV === 'development',
});

/**
 * Helper function to hash passwords
 * Uses bcrypt with 12 rounds (secure and performant)
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * Helper function to verify passwords
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Get current session on the server
 * Returns null if not authenticated
 */
export async function getServerSession() {
  return await auth();
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  return session;
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
