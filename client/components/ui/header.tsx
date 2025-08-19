'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogOut, Coins, Shield } from 'lucide-react';
import { formatCost } from '@/lib/models/pricing';

export function Header() {
  const { data: session, status } = useSession();
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
    <header className="bg-white shadow-lg border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <img 
              src="/logos/svg/Color logo - no background.svg" 
              alt="DecisionForge" 
              className="h-8 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              New Debate
            </Link>
            <Link href="/history" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              History
            </Link>
            <Link href="/usage" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Usage
            </Link>
            <Link href="/models/vote" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">
              Vote Models
            </Link>
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
                  <Link href="/billing" className="flex items-center gap-1 text-sm bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-full transition-colors">
                    <Coins size={16} className="text-green-600" />
                    <span className="font-medium text-green-700">{formatCost(balance)}</span>
                  </Link>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
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
                    Sign up
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