'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Activity, CreditCard, LayoutDashboard, Shield, Vote } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.isAdmin) {
      router.push('/');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/model-requests', icon: Vote, label: 'Model Requests' },
    { href: '/admin/usage', icon: Activity, label: 'Usage Analytics' },
    { href: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg min-h-screen border-r border-slate-200">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <Shield className="h-8 w-8 text-purple-600" />
              <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                               (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-600 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              <p className="font-medium">{session.user.name || session.user.email}</p>
              <p className="text-slate-500">Administrator</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 