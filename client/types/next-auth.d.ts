import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isAdmin?: boolean;
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