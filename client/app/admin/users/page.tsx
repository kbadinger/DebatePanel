'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCost } from '@/lib/models/pricing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Shield, User } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
    currentBalance: number;
    monthlyAllowance: number;
  } | null;
  stats: {
    debates: number;
    totalSpent: number;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '10',
      ...(search && { search }),
      ...(planFilter && { plan: planFilter })
    });

    try {
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, planFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Users</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="teams">Teams</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left text-sm font-medium text-slate-600 px-6 py-3">User</th>
                    <th className="text-left text-sm font-medium text-slate-600 px-6 py-3">Plan</th>
                    <th className="text-left text-sm font-medium text-slate-600 px-6 py-3">Balance</th>
                    <th className="text-left text-sm font-medium text-slate-600 px-6 py-3">Usage</th>
                    <th className="text-left text-sm font-medium text-slate-600 px-6 py-3">Joined</th>
                    <th className="text-left text-sm font-medium text-slate-600 px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-full">
                            {user.isAdmin ? (
                              <Shield className="h-4 w-4 text-purple-600" />
                            ) : (
                              <User className="h-4 w-4 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{user.name || 'No name'}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.subscription ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.subscription.plan === 'free' ? 'bg-slate-100 text-slate-700' :
                            user.subscription.plan === 'starter' ? 'bg-blue-100 text-blue-700' :
                            user.subscription.plan === 'pro' ? 'bg-purple-100 text-purple-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {user.subscription.plan}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">No subscription</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.subscription ? (
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {formatCost(user.subscription.currentBalance)}
                            </p>
                            <p className="text-xs text-slate-500">
                              of {formatCost(user.subscription.monthlyAllowance)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-slate-900">{user.stats.debates} debates</p>
                          <p className="text-xs text-slate-500">{formatCost(user.stats.totalSpent)} spent</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 