'use client';

import { useState } from 'react';
import { AlertTriangle, X, Users, Zap } from 'lucide-react';

interface ModelLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'total-limit' | 'provider-limit';
  providerName?: string;
  currentCount?: number;
  maxCount?: number;
}

export default function ModelLimitDialog({ 
  isOpen, 
  onClose, 
  type, 
  providerName,
  currentCount,
  maxCount 
}: ModelLimitDialogProps) {
  if (!isOpen) return null;

  const isTotalLimit = type === 'total-limit';
  const isProviderLimit = type === 'provider-limit';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 ${
          isTotalLimit ? 'bg-amber-50 border-b border-amber-200' : 'bg-red-50 border-b border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                isTotalLimit ? 'bg-amber-100' : 'bg-red-100'
              }`}>
                {isTotalLimit ? (
                  <Users className={`w-5 h-5 ${
                    isTotalLimit ? 'text-amber-600' : 'text-red-600'
                  }`} />
                ) : (
                  <Zap className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {isTotalLimit ? 'Model Limit Reached' : 'Provider Limit Reached'}
                </h3>
                <p className={`text-sm ${
                  isTotalLimit ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {isTotalLimit ? 'Too many models selected' : `Too many ${providerName} models`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Main message */}
            <div className="text-center">
              <p className="text-slate-700 text-base leading-relaxed">
                {isTotalLimit ? (
                  <>
                    <strong>Maximum 6 models allowed</strong><br />
                    You currently have <span className="font-medium text-slate-900">{currentCount}</span> selected.
                  </>
                ) : (
                  <>
                    <strong>Maximum 2 models per provider</strong><br />
                    You already have 2 <span className="font-medium text-slate-900">{providerName}</span> models selected.
                  </>
                )}
              </p>
            </div>

            {/* Why this limit exists */}
            <div className={`p-4 rounded-lg ${
              isTotalLimit ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Why this limit?
              </h4>
              <ul className="text-sm text-slate-600 space-y-1">
                {isTotalLimit ? (
                  <>
                    <li>• <strong>Better performance:</strong> Prevents timeouts and failures</li>
                    <li>• <strong>Cost control:</strong> Keeps debate costs manageable</li>
                    <li>• <strong>Quality focus:</strong> More readable, actionable results</li>
                  </>
                ) : (
                  <>
                    <li>• <strong>Prevents rate limiting:</strong> Avoid API limits from single provider</li>
                    <li>• <strong>Diverse perspectives:</strong> Better insights across different AI approaches</li>
                    <li>• <strong>Reliable performance:</strong> Spreads load across providers</li>
                  </>
                )}
              </ul>
            </div>

            {/* Suggestions */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-2">💡 Suggestions:</h4>
              <div className="text-sm text-slate-600 space-y-1">
                {isTotalLimit ? (
                  <>
                    <p>Try focusing on <strong>4-6 diverse models</strong> like:</p>
                    <p className="ml-2 text-xs bg-white px-2 py-1 rounded border">
                      GPT-5 • Claude Sonnet 4.0 • Gemini 2.5 Pro • Grok 3
                    </p>
                  </>
                ) : (
                  <>
                    <p>Select models from <strong>different providers</strong> for varied perspectives:</p>
                    <p className="ml-2 text-xs bg-white px-2 py-1 rounded border">
                      OpenAI • Anthropic • Google • X.AI • Others
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}