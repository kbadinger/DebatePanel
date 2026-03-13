'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogOut, Coins, Shield } from 'lucide-react';
import { formatCost } from '@/lib/models/pricing';

export function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (session) {
      fetch('/api/subscription')
        .then(res => res.json())
        .then(data => setBalance(data.currentBalance))
        .catch(err => console.error('Failed to fetch balance:', err));
    }
  }, [session]);
  
  return (
    <header className="bg-white/95 backdrop-blur-md border-b-2 border-purple-200/30 sticky top-0 z-50 shadow-lg" suppressHydrationWarning>
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover-lift">
            <img 
              src="/logos/svg/Color logo - no background.svg" 
              alt="DecisionForge" 
              className="h-14 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-6">
            <button
              onClick={() => router.push('/')}
              className="text-slate-800 hover:text-purple-600 font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <span>⚡</span> New Debate
            </button>
            <button
              onClick={() => router.push('/history')}
              className="text-slate-800 hover:text-purple-600 font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <span>📚</span> History
            </button>
            <button
              onClick={() => router.push('/usage')}
              className="text-slate-800 hover:text-purple-600 font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <span>📊</span> Usage
            </button>
            <button
              onClick={() => router.push('/models/vote')}
              className="text-slate-800 hover:text-purple-600 font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <span>🗳️</span> Vote Models
            </button>
            {session && (
              <button
                onClick={() => router.push('/profiles')}
                className="text-slate-800 hover:text-purple-600 font-bold transition-all hover:scale-105 cursor-pointer"
              >
                <span>👤</span> Profiles
              </button>
            )}
            {session?.user?.isAdmin && (
              <Link href="/admin" className="text-purple-600 hover:text-purple-700 font-medium transition-colors flex items-center gap-1">
                <Shield size={16} />
                Admin
              </Link>
            )}
            
            {status === 'loading' ? (
              <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div>
            ) : session ? (
              <div className="flex items-center gap-3 ml-3 pl-3 border-l border-slate-200">
                {session.user?.isAdmin && (
                  <div className="flex items-center gap-1 text-sm bg-purple-50 px-3 py-1.5 rounded-full">
                    <Shield size={16} className="text-purple-600" />
                    <span className="font-medium text-purple-700">Admin</span>
                  </div>
                )}
                {balance !== null && !session.user?.isAdmin && (
                  <Link href="/billing" className="flex items-center gap-1 text-sm bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-full transition-colors border border-green-300">
                    <Coins size={16} className="text-green-700" />
                    <span className="font-bold text-green-800">{formatCost(balance)}</span>
                  </Link>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                  <User size={16} />
                  <span>{session.user?.name || session.user?.email}</span>
                </div>
                <Button 
                  onClick={() => signOut()} 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-600 hover:text-red-600"
                >
                  <LogOut size={16} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-slate-200">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    Request Access
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}