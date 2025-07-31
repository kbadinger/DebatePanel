'use client';

import { useEffect, useState } from 'react';
import { formatCost } from '@/lib/models/pricing';
import { Users, Activity, DollarSign, TrendingUp, Calendar } from 'lucide-react';

interface DashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalDebates: number;
    totalRevenue: number;
  };
  subscriptions: Array<{
    plan: string;
    count: number;
  }>;
  dailyUsage: Array<{
    date: string;
    revenue: number;
    debates: number;
  }>;
  recentDebates: Array<{
    id: string;
    topic: string;
    createdAt: string;
    user: string;
    status: string;
  }>;
  topModels: Array<{
    modelId: string;
    usage: number;
    revenue: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>Failed to load statistics</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Admin Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.overview.totalUsers}</p>
          <p className="text-sm text-slate-600 mt-1">Registered Users</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-slate-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.overview.activeUsers}</p>
          <p className="text-sm text-slate-600 mt-1">Active Users (30d)</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm text-slate-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.overview.totalDebates}</p>
          <p className="text-sm text-slate-600 mt-1">Debates Created</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-sm text-slate-500">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCost(stats.overview.totalRevenue)}</p>
          <p className="text-sm text-slate-600 mt-1">Total Revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscription Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Subscription Distribution</h2>
          <div className="space-y-3">
            {stats.subscriptions.map(sub => (
              <div key={sub.plan} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    sub.plan === 'free' ? 'bg-slate-400' :
                    sub.plan === 'starter' ? 'bg-blue-500' :
                    sub.plan === 'pro' ? 'bg-purple-500' : 'bg-orange-500'
                  }`} />
                  <span className="text-sm font-medium text-slate-700 capitalize">{sub.plan}</span>
                </div>
                <span className="text-sm text-slate-600">{sub.count} users</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Models */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Models by Usage</h2>
          <div className="space-y-3">
            {stats.topModels.map((model, index) => (
              <div key={model.modelId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                  <span className="text-sm font-medium text-slate-700">{model.modelId}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">{model.usage} uses</p>
                  <p className="text-xs text-slate-500">{formatCost(model.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Debates */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Debates</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-sm font-medium text-slate-600 pb-3">Topic</th>
                  <th className="text-left text-sm font-medium text-slate-600 pb-3">User</th>
                  <th className="text-left text-sm font-medium text-slate-600 pb-3">Status</th>
                  <th className="text-left text-sm font-medium text-slate-600 pb-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentDebates.map(debate => (
                  <tr key={debate.id} className="hover:bg-slate-50">
                    <td className="py-3 text-sm text-slate-700">
                      {debate.topic.length > 50 ? debate.topic.slice(0, 50) + '...' : debate.topic}
                    </td>
                    <td className="py-3 text-sm text-slate-600">{debate.user}</td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        debate.status === 'completed' ? 'bg-green-100 text-green-700' :
                        debate.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {debate.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-slate-500">
                      {new Date(debate.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 