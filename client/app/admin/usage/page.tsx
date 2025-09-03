'use client';

import { useEffect, useState } from 'react';
import { formatCost } from '@/lib/models/pricing';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface UsageData {
  summary: {
    totalEstimatedCost: number;
    totalActualCost: number | null;
    totalDelta: number | null;
    coverageRate: number;
    averageAccuracy: number;
    totalRequests: number;
    actualCostRequests: number;
  };
  models: Array<{
    modelId: string;
    displayName: string;
    provider: string;
    usage: {
      count: number;
      inputTokens: number;
      outputTokens: number;
      actualCostCount: number;
    };
    costs: {
      estimated: number;
      actual: number | null;
      delta: number | null;
      accuracy: number | null;
      hasActualData: boolean;
    };
  }>;
  providers: Array<{
    provider: string;
    usage: {
      totalRequests: number;
      actualCostRequests: number;
      coverage: number;
    };
    costs: {
      estimated: number;
      actual: number | null;
      delta: number | null;
    };
    accuracy: {
      average: number | null;
      avgDelta: number | null;
      sampleSize: number;
    };
  }>;
  dailyTrend: Array<{
    date: string;
    estimatedCost: number;
    actualCost: number | null;
    requestCount: number;
    actualCostCount: number;
    avgAccuracy: number | null;
  }>;
}

function CostComparisonCell({ costs }: { costs: { estimated: number; actual: number | null; delta: number | null; accuracy: number | null; hasActualData: boolean } }) {
  return (
    <div className="flex flex-col space-y-1">
      <span className="font-medium text-gray-900">{formatCost(costs.estimated)}</span>
      {costs.hasActualData ? (
        <>
          <span className="text-sm text-green-600 font-medium">
            {formatCost(costs.actual)} ✓
          </span>
          {costs.delta !== null && (
            <span className={`text-xs flex items-center ${
              costs.delta < 0 ? 'text-blue-500' : costs.delta > 0 ? 'text-orange-500' : 'text-gray-500'
            }`}>
              {costs.delta < 0 ? '▼' : costs.delta > 0 ? '▲' : '='} {formatCost(Math.abs(costs.delta))}
              {costs.accuracy !== null && (
                <span className="ml-1">({(costs.accuracy * 100).toFixed(0)}%)</span>
              )}
            </span>
          )}
        </>
      ) : (
        <span className="text-xs text-gray-400">No actual data</span>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, className = '' }: { title: string; value: string; subtitle?: string; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchUsageData();
  }, [selectedProvider, startDate, endDate]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedProvider !== 'all') {
        params.set('provider', selectedProvider);
      }
      if (startDate) {
        params.set('startDate', startDate);
      }
      if (endDate) {
        params.set('endDate', endDate);
      }
      
      const response = await fetch(`/api/admin/usage?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Usage Analytics</h1>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Usage Analytics</h1>
        <div className="bg-red-50 rounded-lg border border-red-200 p-8 text-center">
          <p className="text-red-600">Error: {error}</p>
          <button 
            onClick={fetchUsageData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Usage Analytics</h1>
        <div className="flex gap-3">
          <a
            href="/admin/usage/reconcile"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            Pull Real Costs
          </a>
          <button
            onClick={fetchUsageData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Provider
            </label>
            <select
              id="provider"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Providers</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="x-ai">X.AI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="mistral">Mistral</option>
              <option value="meta">Meta</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedProvider('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        {(selectedProvider !== 'all' || startDate || endDate) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-blue-700">
                Filters active: 
                {selectedProvider !== 'all' && <span className="ml-1 font-medium">{selectedProvider}</span>}
                {startDate && <span className="ml-1">from {startDate}</span>}
                {endDate && <span className="ml-1">to {endDate}</span>}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legacy Data Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Legacy Data Mode</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Currently showing data from the existing database schema. Enhanced dual cost tracking (estimated vs actual costs) will be available once the database migration is applied to production.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Estimated Cost"
          value={formatCost(data.summary.totalEstimatedCost)}
          subtitle={`${data.summary.totalRequests} total requests`}
        />
        
        <MetricCard
          title="Total Actual Cost"
          value={data.summary.totalActualCost ? formatCost(data.summary.totalActualCost) : 'N/A'}
          subtitle={`${data.summary.actualCostRequests} with real cost data`}
          className={data.summary.totalActualCost ? 'border-green-200 bg-green-50' : ''}
        />
        
        <MetricCard
          title="Cost Delta"
          value={data.summary.totalDelta ? 
            `${data.summary.totalDelta >= 0 ? '+' : ''}${formatCost(data.summary.totalDelta)}` : 
            'N/A'
          }
          subtitle={data.summary.totalDelta ? 
            (data.summary.totalDelta < 0 ? 'Under-estimated' : 'Over-estimated') : 
            'No comparison data'
          }
          className={data.summary.totalDelta ? 
            (data.summary.totalDelta < 0 ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50') : 
            ''
          }
        />
        
        <MetricCard
          title="Average Accuracy"
          value={data.summary.averageAccuracy ? `${(data.summary.averageAccuracy * 100).toFixed(1)}%` : 'N/A'}
          subtitle={`${(data.summary.coverageRate * 100).toFixed(1)}% coverage rate`}
        />
      </div>

      {/* Model Usage Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Model Usage Breakdown</h2>
          <p className="text-sm text-gray-600">Estimated vs actual costs with accuracy metrics</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Times Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens (In/Out)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Analysis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Coverage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.models.map((model) => (
                <tr key={model.modelId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{model.displayName}</div>
                    <div className="text-xs text-gray-500">{model.modelId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {model.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {model.usage.count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {(model.usage.inputTokens / 1000).toFixed(0)}k / {(model.usage.outputTokens / 1000).toFixed(0)}k
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <CostComparisonCell costs={model.costs} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">
                        {model.usage.actualCostCount} / {model.usage.count}
                      </span>
                      <span className="text-xs text-gray-500">
                        {((model.usage.actualCostCount / model.usage.count) * 100).toFixed(0)}% coverage
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provider Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Provider Summary</h2>
          <p className="text-sm text-gray-600">Cost accuracy by AI provider</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {data.providers.map((provider) => (
            <div key={provider.provider} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">{provider.provider}</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Requests:</span>
                  <span className="font-medium">{provider.usage.totalRequests.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Cost Data:</span>
                  <span className="font-medium">
                    {provider.usage.actualCostRequests} ({(provider.usage.coverage * 100).toFixed(0)}%)
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Cost:</span>
                  <span className="font-medium">{formatCost(provider.costs.estimated)}</span>
                </div>
                
                {provider.costs.actual && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actual Cost:</span>
                    <span className="font-medium text-green-600">{formatCost(provider.costs.actual)}</span>
                  </div>
                )}
                
                {provider.accuracy.average && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Accuracy:</span>
                    <span className="font-medium">{(provider.accuracy.average * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Accuracy Visualizations */}
      {data.dailyTrend && data.dailyTrend.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Cost Analysis Trends</h2>
            <p className="text-sm text-gray-600">Daily usage patterns and accuracy metrics</p>
          </div>
          
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Cost Comparison */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Daily Cost: Estimated vs Actual</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={data.dailyTrend.slice(-14).reverse().map(d => ({
                    ...d,
                    actualCost: d.actualCost || undefined // Convert null to undefined for chart
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tickFormatter={(value) => formatCost(value)} />
                  <Tooltip 
                    formatter={(value: number | null, name: string) => {
                      if (value === null || value === undefined) return ['No data', 'Actual Cost'];
                      return [formatCost(value), name === 'estimatedCost' ? 'Estimated' : 'Actual'];
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Bar dataKey="estimatedCost" fill="#3b82f6" name="Estimated Cost" />
                  <Bar dataKey="actualCost" fill="#10b981" name="Actual Cost" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Provider Cost Coverage */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Cost Data Coverage by Provider</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.providers.map(p => ({
                      name: p.provider,
                      value: p.usage.coverage * 100,
                      actualCount: p.usage.actualCostRequests,
                      totalCount: p.usage.totalRequests
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                  >
                    {data.providers.map((entry, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Coverage']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Accuracy Trend */}
          {data.dailyTrend.some(d => d.avgAccuracy !== null && d.avgAccuracy > 0) && (
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Daily Cost Accuracy Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart 
                  data={data.dailyTrend.slice(-14).reverse().map(d => ({
                    ...d,
                    avgAccuracy: d.avgAccuracy || undefined // Convert null to undefined for chart
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    domain={[0, 1]}
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <Tooltip 
                    formatter={(value: number | null) => {
                      if (value === null || value === undefined) return ['No data', 'Accuracy'];
                      return [`${(value * 100).toFixed(1)}%`, 'Accuracy'];
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgAccuracy" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Model Performance Insights */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Performance Insights</h2>
          <p className="text-sm text-gray-600">Key findings from cost analysis</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Most Accurate Model */}
            {(() => {
              const mostAccurate = data.models
                .filter(m => m.costs.hasActualData && m.costs.accuracy !== null)
                .sort((a, b) => (b.costs.accuracy || 0) - (a.costs.accuracy || 0))[0];
              
              return mostAccurate && (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-800 mb-2">🎯 Most Accurate Model</h4>
                  <p className="text-green-700 font-medium">{mostAccurate.displayName}</p>
                  <p className="text-sm text-green-600">
                    {((mostAccurate.costs.accuracy || 0) * 100).toFixed(1)}% accuracy
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Avg delta: {formatCost(Math.abs(mostAccurate.costs.delta || 0))}
                  </p>
                </div>
              );
            })()}

            {/* Biggest Overestimate */}
            {(() => {
              const biggestOver = data.models
                .filter(m => m.costs.hasActualData && (m.costs.delta || 0) < 0)
                .sort((a, b) => (a.costs.delta || 0) - (b.costs.delta || 0))[0];
              
              return biggestOver && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-800 mb-2">📉 Biggest Overestimate</h4>
                  <p className="text-blue-700 font-medium">{biggestOver.displayName}</p>
                  <p className="text-sm text-blue-600">
                    {formatCost(Math.abs(biggestOver.costs.delta || 0))} cheaper than expected
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {((biggestOver.costs.accuracy || 0) * 100).toFixed(1)}% accuracy
                  </p>
                </div>
              );
            })()}

            {/* Most Used Model */}
            {(() => {
              const mostUsed = data.models.sort((a, b) => b.usage.count - a.usage.count)[0];
              
              return mostUsed && (
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <h4 className="font-medium text-purple-800 mb-2">🏆 Most Popular Model</h4>
                  <p className="text-purple-700 font-medium">{mostUsed.displayName}</p>
                  <p className="text-sm text-purple-600">
                    {mostUsed.usage.count.toLocaleString()} requests
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {formatCost(mostUsed.costs.estimated)} total estimated cost
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Cost Accuracy Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">💡 Cost Accuracy Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Overall Accuracy:</span>
                <span className="font-medium ml-2">
                  {data.summary.averageAccuracy ? `${(data.summary.averageAccuracy * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Data Coverage:</span>
                <span className="font-medium ml-2">
                  {(data.summary.coverageRate * 100).toFixed(1)}% of requests
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Delta:</span>
                <span className={`font-medium ml-2 ${
                  data.summary.totalDelta && data.summary.totalDelta < 0 ? 'text-blue-600' : 
                  data.summary.totalDelta && data.summary.totalDelta > 0 ? 'text-orange-600' : 
                  'text-gray-600'
                }`}>
                  {data.summary.totalDelta ? formatCost(data.summary.totalDelta) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 