'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatCost } from '@/lib/models/pricing';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface UsageData {
  currentPeriod: {
    totalCost: number;
    apiCost: number;
    platformFee: number;
    debateCount: number;
    tokenCount: number;
  };
  subscription: {
    plan: string;
    monthlyAllowance: number;
    currentBalance: number;
    rolloverBalance: number;
    periodEnd: string;
  };
  modelBreakdown: Array<{
    modelId: string;
    displayName: string;
    tokenCount: number;
    cost: number;
    percentage: number;
  }>;
  recentDebates: Array<{
    id: string;
    topic: string;
    cost: number;
    modelCount: number;
    createdAt: string;
  }>;
}

export default function UsagePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'current' | 'last'>('current');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/usage');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchUsage();
    }
  }, [period, session]);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/usage?period=${period}`);
      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-lg text-slate-600">Loading usage data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-lg text-slate-600">No usage data available</div>
          </div>
        </div>
      </div>
    );
  }

  const usagePercentage = ((usage.subscription.monthlyAllowance - usage.subscription.currentBalance) / usage.subscription.monthlyAllowance) * 100;
  const remainingDays = Math.ceil((new Date(usage.subscription.periodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const projectedMonthlyUsage = (usage.currentPeriod.totalCost / (30 - remainingDays)) * 30;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Token Usage Dashboard</h1>
          <Link href="/">
            <Button variant="secondary">Back to Debates</Button>
          </Link>
        </div>

        {/* Subscription Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Current Plan</h3>
            <div className="text-2xl font-bold text-blue-600 mb-1">{usage.subscription.plan.charAt(0).toUpperCase() + usage.subscription.plan.slice(1)}</div>
            <div className="text-sm text-slate-500">
              ${usage.subscription.monthlyAllowance}/month allowance
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Current Balance</h3>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatCost(usage.subscription.currentBalance)}
            </div>
            <div className="text-sm text-slate-500">
              {remainingDays} days remaining
            </div>
            {usage.subscription.rolloverBalance > 0 && (
              <div className="text-xs text-amber-600 mt-1">
                Includes {formatCost(usage.subscription.rolloverBalance)} rollover
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Usage This Period</h3>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatCost(usage.currentPeriod.totalCost)}
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${usagePercentage > 80 ? 'bg-red-500' : usagePercentage > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {usagePercentage.toFixed(1)}% of allowance used
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Cost Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">API Costs</span>
                <span className="font-medium">{formatCost(usage.currentPeriod.apiCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Platform Fee (30%)</span>
                <span className="font-medium">{formatCost(usage.currentPeriod.platformFee)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900">Total Cost</span>
                  <span className="font-bold text-lg">{formatCost(usage.currentPeriod.totalCost)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-600 mb-1">Projected Monthly Usage</div>
              <div className={`text-xl font-bold ${projectedMonthlyUsage > usage.subscription.monthlyAllowance ? 'text-red-600' : 'text-green-600'}`}>
                {formatCost(projectedMonthlyUsage)}
              </div>
              {projectedMonthlyUsage > usage.subscription.monthlyAllowance && (
                <div className="text-xs text-red-600 mt-1">
                  ⚠️ On track to exceed allowance
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Usage Statistics</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Debates</span>
                <span className="font-medium">{usage.currentPeriod.debateCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Tokens</span>
                <span className="font-medium">{usage.currentPeriod.tokenCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Avg Cost per Debate</span>
                <span className="font-medium">
                  {formatCost(usage.currentPeriod.totalCost / Math.max(usage.currentPeriod.debateCount, 1))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Avg Tokens per Debate</span>
                <span className="font-medium">
                  {Math.round(usage.currentPeriod.tokenCount / Math.max(usage.currentPeriod.debateCount, 1)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Model Usage Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Model Usage Breakdown</h2>
          <div className="space-y-3">
            {usage.modelBreakdown.map(model => (
              <div key={model.modelId} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-medium text-slate-700">{model.displayName}</span>
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${model.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600 w-12 text-right">{model.percentage}%</span>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-sm text-slate-500">
                    {model.tokenCount.toLocaleString()} tokens
                  </span>
                  <span className="font-medium text-slate-900 w-20 text-right">
                    {formatCost(model.cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Debates */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Debates</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Topic</th>
                  <th className="text-center py-2 px-4 text-sm font-semibold text-slate-700">Models</th>
                  <th className="text-right py-2 px-4 text-sm font-semibold text-slate-700">Cost</th>
                  <th className="text-right py-2 px-4 text-sm font-semibold text-slate-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {usage.recentDebates.map(debate => (
                  <tr key={debate.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link href={`/debate/${debate.id}`} className="text-blue-600 hover:underline">
                        {debate.topic.length > 60 ? debate.topic.substring(0, 60) + '...' : debate.topic}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {debate.modelCount}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCost(debate.cost)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 text-sm">
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