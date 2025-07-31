'use client';

import { ModelResponse } from '@/types/debate';
import { AVAILABLE_MODELS } from '@/lib/models/config';
import { clsx } from 'clsx';
import { User, Sparkles } from 'lucide-react';

interface ModelResponseCardProps {
  response: ModelResponse;
  isStreaming?: boolean;
}

export function ModelResponseCard({ response, isStreaming }: ModelResponseCardProps) {
  const model = AVAILABLE_MODELS.find(m => m.id === response.modelId);
  const isHuman = response.isHuman || response.modelId.startsWith('human-');
  
  // For round 1, show stance. For round 2+, show consensus alignment
  const showConsensus = response.round > 1 && response.consensusAlignment;
  
  // Consensus color scheme (for round 2+)
  const consensusColors = {
    'strong-consensus': 'border-green-500 bg-green-50',
    'partial-consensus': 'border-green-400 bg-green-50/70',
    'independent': 'border-yellow-500 bg-yellow-50',
    'divergent': 'border-orange-500 bg-orange-50',
    'strong-dissent': 'border-red-500 bg-red-50',
  };
  
  // Position colors (fallback for round 1)
  const positionColors = {
    'strongly-agree': 'border-green-500 bg-green-50',
    'agree': 'border-green-400 bg-green-50/70',
    'neutral': 'border-yellow-500 bg-yellow-50',
    'disagree': 'border-orange-500 bg-orange-50',
    'strongly-disagree': 'border-red-500 bg-red-50',
  };
  
  // Consensus indicators
  const consensusIndicators = {
    'strong-consensus': { color: 'bg-green-500', label: 'Strong Consensus' },
    'partial-consensus': { color: 'bg-green-400', label: 'Partial Consensus' },
    'independent': { color: 'bg-yellow-500', label: 'Independent Position' },
    'divergent': { color: 'bg-orange-500', label: 'Divergent View' },
    'strong-dissent': { color: 'bg-red-500', label: 'Strong Dissent' },
  };
  
  const colorScheme = showConsensus 
    ? consensusColors[response.consensusAlignment!] 
    : positionColors[response.position];
    
  const indicator = showConsensus
    ? consensusIndicators[response.consensusAlignment!]
    : { color: 'bg-gray-400', label: response.stance || 'Initial Position' };
  
  return (
    <div className={clsx(
      'rounded-xl border-2 p-6 mb-4 transition-all shadow-lg',
      colorScheme || 'border-slate-400 bg-slate-50',
      isStreaming && 'animate-pulse'
    )}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-xl text-slate-800">{model?.displayName || response.modelId}</h3>
          <div className="flex items-center gap-2 mt-1">
            {showConsensus && (
              <>
                <div className={clsx('w-3 h-3 rounded-full', indicator.color)} />
                <span className="text-sm font-medium text-slate-700">{indicator.label}</span>
              </>
            )}
            {response.stance && (
              <span className="text-sm font-semibold text-slate-800">
                {response.round === 1 ? 'Recommends: ' : 'Position: '}
                {response.stance}
              </span>
            )}
            <span className="text-sm text-slate-500">• {response.confidence}% confident</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Round {response.round}
        </div>
      </div>
      
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{response.content}</p>
      </div>
    </div>
  );
}