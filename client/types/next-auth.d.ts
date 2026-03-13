import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isAdmin?: boolean;
      emailVerified?: Date | null;
      subscription?: {
        plan: string;
        status: string;
      };
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    isAdmin?: boolean;
  }
}