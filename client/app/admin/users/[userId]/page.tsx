'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatCost } from '@/lib/models/pricing';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, User, Mail, Calendar, Shield, CreditCard, 
  Activity, Plus, AlertCircle 
} from 'lucide-react';

interface UserDetail {
  user: {
    id: string;
    email: string;
    name: string | null;
    isAdmin: boolean;
    createdAt: string;
    emailVerified: string | null;
    subscription: {
      plan: string;
      status: string;
      currentBalance: number;
      monthlyAllowance: number;
      currentPeriodStart: string;
      currentPeriodEnd: string;
    } | null;
    debates: Array<{
      id: string;
      topic: string;
      createdAt: string;
      status: string;
      rounds: number;
      models: string[];
    }>;
  };
  usage: {
    total: {
      cost: number;
      count: number;
    };
    currentMonth: {
      cost: number;
    };
    byModel: Array<{
      modelId: string;
      count: number;
      cost: number;
    }>;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCredits, setShowAddCredits] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [addingCredits, setAddingCredits] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      setData(data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const handleAddCredits = async () => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setAddingCredits(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-credits',
          amount,
          reason: creditReason
        })
      });

      if (res.ok) {
        await fetchUser();
        setShowAddCredits(false);
        setCreditAmount('');
        setCreditReason('');
      }
    } catch (error) {
      console.error('Failed to add credits:', error);
    } finally {
      setAddingCredits(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (!confirm(`Are you sure you want to ${data?.user.isAdmin ? 'remove' : 'grant'} admin privileges?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-admin',
          isAdmin: !data?.user.isAdmin
        })
      });

      if (res.ok) {
        await fetchUser();
      }
    } catch (error) {
      console.error('Failed to toggle admin:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div>User not found</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/users')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 rounded-full">
              {data.user.isAdmin ? (
                <Shield className="h-6 w-6 text-purple-600" />
              ) : (
                <User className="h-6 w-6 text-slate-600" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {data.user.name || 'No name'}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {data.user.email}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(data.user.createdAt).toLocaleDateString()}
                </div>
              </div>
              {data.user.isAdmin && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  <Shield className="h-3 w-3" />
                  Administrator
                </span>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleToggleAdmin}
          >
            {data.user.isAdmin ? 'Remove Admin' : 'Make Admin'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription & Credits */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription & Credits
            </h2>
            <Button
              size="sm"
              onClick={() => setShowAddCredits(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Credits
            </Button>
          </div>

          {data.user.subscription ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Plan</span>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  data.user.subscription.plan === 'free' ? 'bg-slate-100 text-slate-700' :
                  data.user.subscription.plan === 'starter' ? 'bg-blue-100 text-blue-700' :
                  data.user.subscription.plan === 'pro' ? 'bg-purple-100 text-purple-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {SUBSCRIPTION_PLANS[data.user.subscription.plan as keyof typeof SUBSCRIPTION_PLANS]?.name || data.user.subscription.plan}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Status</span>
                <span className="text-sm font-medium text-slate-900">{data.user.subscription.status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Current Balance</span>
                <span className="text-sm font-medium text-slate-900">{formatCost(data.user.subscription.currentBalance)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Monthly Allowance</span>
                <span className="text-sm font-medium text-slate-900">{formatCost(data.user.subscription.monthlyAllowance)}</span>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Period: {new Date(data.user.subscription.currentPeriodStart).toLocaleDateString()} - {new Date(data.user.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No subscription</p>
          )}
        </div>

        {/* Usage Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5" />
            Usage Statistics
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Debates</span>
              <span className="text-sm font-medium text-slate-900">{data.usage.total.count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Spent</span>
              <span className="text-sm font-medium text-slate-900">{formatCost(data.usage.total.cost)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">This Month</span>
              <span className="text-sm font-medium text-slate-900">{formatCost(data.usage.currentMonth.cost)}</span>
            </div>
          </div>
        </div>

        {/* Recent Debates */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Debates</h2>
          {data.user.debates.length > 0 ? (
            <div className="space-y-3">
              {data.user.debates.map(debate => (
                <div key={debate.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {debate.topic.length > 60 ? debate.topic.slice(0, 60) + '...' : debate.topic}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {debate.rounds} rounds • {debate.models.length} models • {new Date(debate.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    debate.status === 'completed' ? 'bg-green-100 text-green-700' :
                    debate.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {debate.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No debates yet</p>
          )}
        </div>
      </div>

      {/* Add Credits Modal */}
      {showAddCredits && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Credits</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="10.00"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="reason">Reason (optional)</Label>
                <Input
                  id="reason"
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g., Compensation for service issue"
                  className="mt-1"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    This will immediately add credits to the user&apos;s balance. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                className="flex-1"
                onClick={handleAddCredits}
                disabled={addingCredits}
              >
                {addingCredits ? 'Adding...' : 'Add Credits'}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowAddCredits(false);
                  setCreditAmount('');
                  setCreditReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 