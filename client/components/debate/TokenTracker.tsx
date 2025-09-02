'use client';

import React from 'react';
import { Model, DebateConfig, ResponseLength } from '@/types/debate';
import { 
  estimateResponseTokens, 
  checkContextLimit,
  formatTokenCount,
  formatTokenCost,
  RESPONSE_LENGTH_OPTIONS
} from '@/lib/tokenization';
import { MODEL_PRICING } from '@/lib/models/pricing';
import { AlertTriangle, Info, CheckCircle, XCircle, Zap, DollarSign } from 'lucide-react';

interface TokenUsage {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface TokenTrackerProps {
  config: DebateConfig;
  currentRound: number;
  actualUsage: TokenUsage[];
  className?: string;
}

export function TokenTracker({ 
  config, 
  currentRound, 
  actualUsage,
  className = '' 
}: TokenTrackerProps) {
  const responseLength = config.responseLength || 'standard';
  const responseConfig = RESPONSE_LENGTH_OPTIONS[responseLength];
  
  // Calculate estimated vs actual usage
  const estimatedUsage = config.models.map(model => {
    const estimation = estimateResponseTokens(
      model,
      config.topic,
      config.description || '',
      config.style,
      currentRound,
      [], // Previous rounds context - would need to pass this in
      responseLength
    );
    
    // Get pricing for cost calculation
    const pricing = MODEL_PRICING[model.id];
    const inputCost = pricing ? (estimation.inputTokens / 1000) * pricing.costPer1kTokens.input : 0;
    const outputCost = pricing ? (estimation.outputTokens / 1000) * pricing.costPer1kTokens.output : 0;
    const totalCost = (inputCost + outputCost) * (1 + (pricing?.platformMarkup || 0.3));
    
    return {
      modelId: model.id,
      modelName: model.displayName,
      estimatedTokens: estimation.totalTokens,
      estimatedCost: totalCost,
      contextCheck: checkContextLimit(model, estimation.totalTokens * config.rounds)
    };
  });
  
  // Calculate totals
  const totalEstimatedTokens = estimatedUsage.reduce((sum, usage) => sum + usage.estimatedTokens, 0);
  const totalEstimatedCost = estimatedUsage.reduce((sum, usage) => sum + usage.estimatedCost, 0);
  const totalActualTokens = actualUsage.reduce((sum, usage) => sum + usage.inputTokens + usage.outputTokens, 0);
  const totalActualCost = actualUsage.reduce((sum, usage) => sum + usage.cost, 0);
  
  // Find worst context warning
  const worstContextWarning = estimatedUsage.reduce((worst, current) => 
    current.contextCheck.usagePercentage > worst ? current.contextCheck.usagePercentage : worst, 0
  );
  
  const getWarningIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'caution': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };
  
  const getWarningColor = (level: string) => {
    switch (level) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-amber-200 bg-amber-50';
      case 'caution': return 'border-blue-200 bg-blue-50';
      default: return 'border-green-200 bg-green-50';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Token Usage</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estimated:</span>
              <span className="font-mono">{formatTokenCount(totalEstimatedTokens)}</span>
            </div>
            {totalActualTokens > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Actual:</span>
                <span className="font-mono text-blue-600">{formatTokenCount(totalActualTokens)}</span>
              </div>
            )}
            <div className="text-xs text-gray-500">
              Response: {responseConfig.label} ({formatTokenCount(responseConfig.targetTokens)} each)
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm">Cost Tracking</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estimated:</span>
              <span className="font-mono">{formatTokenCost(totalEstimatedCost)}</span>
            </div>
            {totalActualCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Actual:</span>
                <span className="font-mono text-green-600">{formatTokenCost(totalActualCost)}</span>
              </div>
            )}
            <div className="text-xs text-gray-500">
              Round {currentRound} of {config.rounds}
            </div>
          </div>
        </div>
      </div>

      {/* Context Warnings */}
      {worstContextWarning > 50 && (
        <div className={`border rounded-lg p-3 ${getWarningColor(
          worstContextWarning > 95 ? 'critical' : 
          worstContextWarning > 80 ? 'warning' : 'caution'
        )}`}>
          <div className="flex items-center gap-2 mb-2">
            {getWarningIcon(
              worstContextWarning > 95 ? 'critical' : 
              worstContextWarning > 80 ? 'warning' : 'caution'
            )}
            <span className="font-medium text-sm">Context Usage Warning</span>
          </div>
          <div className="text-sm text-gray-700">
            {worstContextWarning > 95 && 'Some models may exceed context limits. Consider reducing response length or rounds.'}
            {worstContextWarning <= 95 && worstContextWarning > 80 && 'High context usage detected. Monitor for potential issues in longer rounds.'}
            {worstContextWarning <= 80 && 'Moderate context usage. Should handle remaining rounds well.'}
          </div>
        </div>
      )}

      {/* Per-Model Breakdown */}
      <div className="border rounded-lg">
        <div className="p-3 border-b bg-gray-50">
          <h4 className="font-medium text-sm">Per-Model Usage</h4>
        </div>
        <div className="divide-y">
          {estimatedUsage.map((usage) => {
            const actualModelUsage = actualUsage.find(u => u.modelId === usage.modelId);
            return (
              <div key={usage.modelId} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{usage.modelName}</span>
                  <div className="flex items-center gap-2">
                    {getWarningIcon(usage.contextCheck.warningLevel)}
                    <span className="text-xs text-gray-500">
                      {usage.contextCheck.usagePercentage}% context
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-gray-600">Tokens (Est.)</div>
                    <div className="font-mono">{formatTokenCount(usage.estimatedTokens)}</div>
                    {actualModelUsage && (
                      <div className="text-blue-600 font-mono">
                        {formatTokenCount(actualModelUsage.inputTokens + actualModelUsage.outputTokens)} (actual)
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-600">Cost (Est.)</div>
                    <div className="font-mono">{formatTokenCost(usage.estimatedCost)}</div>
                    {actualModelUsage && (
                      <div className="text-green-600 font-mono">
                        {formatTokenCost(actualModelUsage.cost)} (actual)
                      </div>
                    )}
                  </div>
                </div>
                {usage.contextCheck.warningLevel !== 'safe' && (
                  <div className="mt-2 text-xs text-gray-600">
                    {usage.contextCheck.recommendation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Efficiency Metrics */}
      {totalActualTokens > 0 && (
        <div className="border rounded-lg p-3 bg-blue-50">
          <h4 className="font-medium text-sm mb-2">Accuracy</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-600">Token Estimation</div>
              <div className="font-mono">
                {totalActualTokens > 0 
                  ? `${Math.round((totalActualTokens / totalEstimatedTokens) * 100)}% of estimate`
                  : 'Pending...'
                }
              </div>
            </div>
            <div>
              <div className="text-gray-600">Cost Estimation</div>
              <div className="font-mono">
                {totalActualCost > 0 
                  ? `${Math.round((totalActualCost / totalEstimatedCost) * 100)}% of estimate`
                  : 'Pending...'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}