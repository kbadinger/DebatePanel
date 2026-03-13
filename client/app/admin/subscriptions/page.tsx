'use client';

import { useState, useEffect } from 'react';
import { formatCost } from '@/lib/models/pricing';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Edit,
  RefreshCw
} from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
}

interface StripeData {
  customer: any;
  subscription: any;
  recentInvoices: any[];
  hasPaymentMethod: boolean;
}

interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  monthlyAllowance: number;
  currentBalance: number;
  rolloverBalance: number;
  rolloverExpiry: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
  stripeData: StripeData | null;
}

interface Analytics {
  overview: {
    totalSubscriptions: number;
    monthlyRecurringRevenue: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    churnRate: number;
    arpu: number;
  };
  planDistribution: Array<{
    plan: string;
    name: string;
    count: number;
    revenue: number;
  }>;
  usage: {
    totalCost: number;
    totalRecords: number;
    creditsIssued: number;
    creditsUsed: number;
    creditUtilization: number;
  };
  stripe: {
    revenue: number;
    transactions: number;
  };
  growth: Array<{
    month: string;
    subscriptions: number;
    mrr: number;
  }>;
  period: number;
}

interface SubscriptionResponse {
  subscriptions: Subscription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and pagination
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Edit modal state
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState({
    plan: '',
    monthlyAllowance: 0,
    currentBalance: 0,
    status: ''
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...(search && { search }),
        ...(planFilter && { plan: planFilter }),
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/subscriptions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch subscriptions');

      const data: SubscriptionResponse = await response.json();
      setSubscriptions(data.subscriptions);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch('/api/admin/subscriptions/analytics?period=30');
      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data: Analytics = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const updateSubscription = async (subscriptionId: string, updates: any) => {
    try {
      const response = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, updates })
      });

      if (!response.ok) throw new Error('Failed to update subscription');

      const result = await response.json();
      
      // Update the subscription in the local state
      setSubscriptions(subs => 
        subs.map(sub => sub.id === subscriptionId ? result.subscription : sub)
      );
      
      setEditingSubscription(null);
      return result;
    } catch (err) {
      throw err;
    }
  };

  const openEditModal = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditForm({
      plan: subscription.plan,
      monthlyAllowance: subscription.monthlyAllowance,
      currentBalance: subscription.currentBalance,
      status: subscription.status
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription) return;

    try {
      await updateSubscription(editingSubscription.id, {
        ...editForm,
        stripePriceId: SUBSCRIPTION_PLANS[editForm.plan as keyof typeof SUBSCRIPTION_PLANS]?.stripePriceId
      });
    } catch (err) {
      alert('Failed to update subscription: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const exportSubscriptions = () => {
    const csvContent = [
      'User Name,Email,Plan,Status,Monthly Allowance,Current Balance,Created At,Stripe Customer ID',
      ...subscriptions.map(sub => [
        sub.user.name || '',
        sub.user.email,
        sub.plan,
        sub.status,
        sub.monthlyAllowance,
        sub.currentBalance,
        new Date(sub.createdAt).toLocaleDateString(),
        sub.stripeCustomerId || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [currentPage, search, planFilter, statusFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !subscriptions.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Subscription Management</h1>
        <div className="flex gap-2">
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportSubscriptions} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {!analyticsLoading && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{analytics.overview.totalSubscriptions}</p>
            <p className="text-sm text-slate-600">Total Subscriptions</p>
            <p className="text-xs text-green-600 mt-1">+{analytics.overview.newSubscriptions} this month</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCost(analytics.overview.monthlyRecurringRevenue)}</p>
            <p className="text-sm text-slate-600">Monthly Recurring Revenue</p>
            <p className="text-xs text-slate-500 mt-1">ARPU: {formatCost(analytics.overview.arpu)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{analytics.usage.creditUtilization}%</p>
            <p className="text-sm text-slate-600">Credit Utilization</p>
            <p className="text-xs text-slate-500 mt-1">{formatCost(analytics.usage.creditsUsed)} used</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{analytics.overview.churnRate.toFixed(1)}%</p>
            <p className="text-sm text-slate-600">Churn Rate</p>
            <p className="text-xs text-red-600 mt-1">{analytics.overview.canceledSubscriptions} canceled</p>
          </div>
        </div>
      )}

      {/* Plan Distribution */}
      {!analyticsLoading && analytics && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Plan Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.planDistribution.map(plan => (
              <div key={plan.plan} className="text-center">
                <div className={`w-full h-2 rounded-full mb-2 ${
                  plan.plan === 'free' ? 'bg-slate-400' :
                  plan.plan === 'starter' ? 'bg-blue-500' :
                  plan.plan === 'pro' ? 'bg-purple-500' : 'bg-orange-500'
                }`} style={{ 
                  width: `${(plan.count / analytics.overview.totalSubscriptions) * 100}%` 
                }}></div>
                <p className="font-medium text-slate-900">{plan.name}</p>
                <p className="text-sm text-slate-600">{plan.count} users</p>
                <p className="text-xs text-slate-500">{formatCost(plan.revenue)}/month</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                id="search"
                placeholder="Name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="plan-filter">Filter by Plan</Label>
            <select
              id="plan-filter"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Plans</option>
              {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                <option key={key} value={key}>{plan.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="status-filter">Filter by Status</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="canceled">Canceled</option>
              <option value="past_due">Past Due</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={() => {
                setSearch('');
                setPlanFilter('');
                setStatusFilter('');
                setCurrentPage(1);
              }}
              variant="outline"
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Credits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Stripe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-slate-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-700">
                            {(subscription.user.name || subscription.user.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">
                          {subscription.user.name || 'No name'}
                        </div>
                        <div className="text-sm text-slate-500">{subscription.user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      subscription.plan === 'free' ? 'bg-slate-100 text-slate-700' :
                      subscription.plan === 'starter' ? 'bg-blue-100 text-blue-700' :
                      subscription.plan === 'pro' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {SUBSCRIPTION_PLANS[subscription.plan as keyof typeof SUBSCRIPTION_PLANS]?.name || subscription.plan}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                      subscription.status === 'canceled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {subscription.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    <div>
                      <p className="font-medium">{formatCost(subscription.currentBalance)}</p>
                      <p className="text-xs text-slate-500">of {formatCost(subscription.monthlyAllowance)}</p>
                      {subscription.rolloverBalance > 0 && (
                        <p className="text-xs text-purple-600">+{formatCost(subscription.rolloverBalance)} rollover</p>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div>
                      <p>Next: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                      <p className="text-xs">
                        Period: {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {subscription.stripeCustomerId ? (
                      <div>
                        <p className="text-xs text-green-600">✓ Connected</p>
                        {subscription.stripeData?.hasPaymentMethod ? (
                          <p className="text-xs text-green-600">✓ Payment Method</p>
                        ) : (
                          <p className="text-xs text-orange-600">⚠ No Payment Method</p>
                        )}
                        {subscription.stripeData?.recentInvoices?.length > 0 && (
                          <p className="text-xs">
                            Last: {formatCost(subscription.stripeData.recentInvoices[0].amount_paid / 100)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No Stripe</p>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button
                      onClick={() => openEditModal(subscription)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {subscription.stripeCustomerId && (
                      <Button
                        onClick={() => window.open(`https://dashboard.stripe.com/customers/${subscription.stripeCustomerId}`, '_blank')}
                        variant="outline"
                        size="sm"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Stripe
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-slate-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-slate-700">
                  Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span> of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page === pagination.pages}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Subscription Modal */}
      {editingSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Subscription</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-plan">Plan</Label>
                <select
                  id="edit-plan"
                  value={editForm.plan}
                  onChange={(e) => setEditForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                    <option key={key} value={key}>{plan.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="edit-allowance">Monthly Allowance ($)</Label>
                <Input
                  id="edit-allowance"
                  type="number"
                  step="0.01"
                  value={editForm.monthlyAllowance}
                  onChange={(e) => setEditForm(f => ({ ...f, monthlyAllowance: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <Label htmlFor="edit-balance">Current Balance ($)</Label>
                <Input
                  id="edit-balance"
                  type="number"
                  step="0.01"
                  value={editForm.currentBalance}
                  onChange={(e) => setEditForm(f => ({ ...f, currentBalance: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editForm.status}
                  onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="active">Active</option>
                  <option value="canceled">Canceled</option>
                  <option value="past_due">Past Due</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="submit" className="flex-1">
                  Save Changes
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingSubscription(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}