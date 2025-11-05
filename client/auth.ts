import NextAuth, { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('[Auth] Missing credentials');
            throw new Error('Invalid credentials');
          }

          console.log('[Auth] Attempting login for:', credentials.email);

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) {
            console.error('[Auth] User not found:', credentials.email);
            throw new Error('Invalid credentials');
          }

          if (!user.password) {
            console.error('[Auth] User has no password (OAuth only?):', credentials.email);
            throw new Error('Invalid credentials');
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            console.error('[Auth] Invalid password for:', credentials.email);
            throw new Error('Invalid credentials');
          }

          console.log('[Auth] Login successful for:', credentials.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error('[Auth] Authorization error:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
        
        // Get user details including admin status and email verification
        const fullUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { isAdmin: true, emailVerified: true }
        });
        
        session.user.isAdmin = fullUser?.isAdmin || false;
        session.user.emailVerified = fullUser?.emailVerified;
        
        // Get subscription details
        const subscription = await prisma.subscription.findUnique({
          where: { userId: token.userId as string },
        });
        
        session.user.subscription = subscription || {
          plan: 'free',
          status: 'active',
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as auth };
export default handler;