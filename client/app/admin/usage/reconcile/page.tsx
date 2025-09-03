'use client';

import { useState, useEffect } from 'react';
import { formatCost } from '@/lib/models/pricing';

interface CostReconciliationResult {
  provider: string;
  totalFetched: number;
  totalCostUSD: number;
  matched: number;
  unmatched: number;
  updated: number;
  costs: Array<{
    timestamp: string;
    model: string;
    cost: number;
    tokens: { input: number; output: number };
    matched: boolean;
    usageRecordId?: string;
  }>;
}

interface ReconciliationResponse {
  success: boolean;
  summary: {
    totalProviders: number;
    totalCostsFetched: number;
    totalCostUSD: number;
    totalMatched: number;
    totalUnmatched: number;
    totalUpdated: number;
  };
  results: CostReconciliationResult[];
  error?: string;
  details?: string;
  timestamp: string;
}

interface RecentRecord {
  id: string;
  modelId: string;
  modelProvider: string;
  createdAt: string;
  estimatedApiCost: number | null;
  actualApiCost: number | null;
  costDelta: number | null;
  costAccuracy: number | null;
  providerCostFetchedAt: string;
  reconciliationNotes: string | null;
}

export default function CostReconciliationPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ReconciliationResponse | null>(null);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [selectedDates, setSelectedDates] = useState({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    endDate: new Date().toISOString().split('T')[0], // Today
  });

  useEffect(() => {
    fetchRecentRecords();
  }, []);

  const fetchRecentRecords = async () => {
    try {
      const response = await fetch('/api/admin/costs/pull?days=7');
      if (response.ok) {
        const data = await response.json();
        setRecentRecords(data.recentRecords || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent records:', error);
    }
  };

  const pullCosts = async (provider: 'all' | 'openai' | 'anthropic') => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/admin/costs/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: selectedDates.startDate,
          endDate: selectedDates.endDate,
          provider,
        }),
      });

      const data = await response.json();
      setResults(data);

      if (data.success) {
        // Refresh recent records
        await fetchRecentRecords();
      }
    } catch (error) {
      console.error('Cost pull failed:', error);
      setResults({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error',
        summary: { totalProviders: 0, totalCostsFetched: 0, totalCostUSD: 0, totalMatched: 0, totalUnmatched: 0, totalUpdated: 0 },
        results: [],
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setSelectedDates({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Cost Reconciliation</h1>
        <div className="text-sm text-slate-500">
          Pull real costs from AI providers to update estimated costs
        </div>
      </div>

      {/* Database Migration Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Database Migration Required</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>The enhanced cost tracking features require a database migration to be applied to production. Currently, the system will update existing cost fields with actual costs from providers. Full dual-cost tracking will be available once the migration is deployed.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Date Range</h2>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={selectedDates.startDate}
              onChange={(e) => setSelectedDates(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={selectedDates.endDate}
              onChange={(e) => setSelectedDates(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => getQuickDateRange(1)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Yesterday
            </button>
            <button
              onClick={() => getQuickDateRange(3)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Last 3 Days
            </button>
            <button
              onClick={() => getQuickDateRange(7)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Last Week
            </button>
          </div>
        </div>
      </div>

      {/* Pull Buttons */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pull Real Costs</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => pullCosts('openai')}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Pulling...' : 'Pull OpenAI Costs'}
          </button>
          
          <button
            onClick={() => pullCosts('anthropic')}
            disabled={loading}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Pulling...' : 'Pull Anthropic Costs'}
          </button>
          
          <button
            onClick={() => pullCosts('all')}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Pulling...' : 'Pull All Providers'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pull Results
            <span className="ml-2 text-sm font-normal text-gray-500">
              {new Date(results.timestamp).toLocaleString()}
            </span>
          </h2>

          {results.success ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600">Providers</div>
                  <div className="text-2xl font-bold text-blue-900">{results.summary.totalProviders}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">Costs Fetched</div>
                  <div className="text-2xl font-bold text-green-900">{results.summary.totalCostsFetched}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600">Total Cost</div>
                  <div className="text-2xl font-bold text-purple-900">{formatCost(results.summary.totalCostUSD)}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600">Matched</div>
                  <div className="text-2xl font-bold text-orange-900">{results.summary.totalMatched}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600">Unmatched</div>
                  <div className="text-2xl font-bold text-red-900">{results.summary.totalUnmatched}</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="text-sm text-indigo-600">Updated</div>
                  <div className="text-2xl font-bold text-indigo-900">{results.summary.totalUpdated}</div>
                </div>
              </div>

              {/* Provider Results */}
              {results.results.map((result) => (
                <div key={result.provider} className="mb-6 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 capitalize">
                    {result.provider} Results
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {result.totalFetched} costs, {formatCost(result.totalCostUSD)} total
                    </span>
                  </h3>

                  {result.costs.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {result.costs.slice(0, 10).map((cost, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(cost.timestamp).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {cost.model}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCost(cost.cost)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cost.tokens.input + cost.tokens.output}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {cost.matched ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Matched
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Unmatched
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.costs.length > 10 && (
                        <div className="px-6 py-3 text-sm text-gray-500">
                          ... and {result.costs.length - 10} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-medium">Error: {results.error}</h3>
              {results.details && (
                <p className="text-red-600 text-sm mt-1">{results.details}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Records */}
      {recentRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Cost Updates
            <span className="ml-2 text-sm font-normal text-gray-500">
              Last 7 days
            </span>
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estimated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentRecords.slice(0, 20).map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.modelId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {record.modelProvider}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.estimatedApiCost ? formatCost(record.estimatedApiCost) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {record.actualApiCost ? formatCost(record.actualApiCost) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.costDelta ? (
                        <span className={record.costDelta < 0 ? 'text-blue-600' : 'text-orange-600'}>
                          {record.costDelta < 0 ? '▼' : '▲'} {formatCost(Math.abs(record.costDelta))}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.costAccuracy ? `${(record.costAccuracy * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(record.providerCostFetchedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}