'use client';

import { ModelResponse } from '@/types/debate';
import { AVAILABLE_MODELS } from '@/lib/models/config';
import { clsx } from 'clsx';
import { User, Sparkles, Copy, Check, Download } from 'lucide-react';
import { useState } from 'react';

interface ModelResponseCardProps {
  response: ModelResponse;
  isStreaming?: boolean;
  debateId?: string;
}

export function ModelResponseCard({ response, isStreaming, debateId }: ModelResponseCardProps) {
  const model = AVAILABLE_MODELS.find(m => m.id === response.modelId);
  const isHuman = response.isHuman || response.modelId.startsWith('human-');
  const [copied, setCopied] = useState(false);
  
  // Check if this is an error or context limit exceeded response
  const isContextError = response.content.includes('⚠️ Context limit exceeded');
  const isError = response.content.includes('❌ Error:') || response.content.includes('❌ Complete failure');
  const isTruncated = response.content.includes('Truncated for streaming - full response available after debate completes') ||
                      response.content.includes('Response continues - see full version in download');
  const hasError = isContextError || isError;
  
  const handleCopy = async () => {
    const textToCopy = `${model?.displayName || response.modelId} - Round ${response.round}\n\n${response.content}\n\nPosition: ${response.position}\nConfidence: ${response.confidence}%`;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadResponse = async () => {
    if (!debateId) {
      alert('Debate ID not available for download');
      return;
    }
    
    try {
      const downloadResponse = await fetch(`/api/debate/${debateId}/download-response?modelId=${response.modelId}&round=${response.round}`);
      if (!downloadResponse.ok) throw new Error('Download failed');
      
      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model?.displayName || response.modelId}-round-${response.round}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download response');
    }
  };
  
  // For round 1, show stance. For round 2+, show consensus alignment
  const showConsensus = response.round > 1 && response.consensusAlignment && !hasError;
  
  // Error color schemes
  const errorColors = {
    context: 'border-amber-500 bg-amber-50',
    error: 'border-red-500 bg-red-50'
  };
  
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
  
  let colorScheme: string;
  let indicator: { color: string; label: string };
  
  if (hasError) {
    colorScheme = isContextError ? errorColors.context : errorColors.error;
    indicator = { 
      color: isContextError ? 'bg-amber-500' : 'bg-red-500', 
      label: isContextError ? 'Context Limit Reached' : 'Error' 
    };
  } else if (showConsensus) {
    colorScheme = consensusColors[response.consensusAlignment!];
    indicator = consensusIndicators[response.consensusAlignment!];
  } else if (response.round === 1) {
    // Round 1: No colors, neutral styling
    colorScheme = 'border-slate-300 bg-white';
    indicator = { color: 'bg-gray-400', label: response.stance || 'Initial Position' };
  } else {
    colorScheme = positionColors[response.position];
    indicator = { color: 'bg-gray-400', label: response.stance || 'Position' };
  }
  
  return (
    <div className={clsx(
      'rounded-2xl border-2 p-6 mb-4 transition-all shadow-xl hover-lift debate-card-enter relative',
      isHuman ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-blue-50' : (colorScheme || 'border-slate-400 bg-slate-50'),
      isStreaming && 'animate-pulse'
    )}>
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex-1">
          <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            {isHuman ? (
              <>
                <User className="w-5 h-5 text-purple-600" />
                {response.userName || 'Human Participant'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                {model?.displayName || response.modelId}
              </>
            )}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {showConsensus && (
              <>
                <div className={clsx('w-3 h-3 rounded-full', indicator.color)} />
                <span className="text-sm font-medium text-slate-700">{indicator.label}</span>
              </>
            )}
            {response.stance && !hasError && (
              <span className="text-sm font-semibold text-slate-800">
                {response.round === 1 ? 'Recommends: ' : 'Position: '}
                {response.stance}
              </span>
            )}
            {!hasError && (
              <span className="text-sm text-slate-500">• {response.confidence}% confident</span>
            )}
            {hasError && (
              <span className="text-sm text-slate-500">• Unable to participate</span>
            )}
            {isTruncated && (
              <span className="text-sm text-amber-600">• Response truncated (full version in download)</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Copy response"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {isTruncated && debateId && (
            <button
              onClick={handleDownloadResponse}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Download full untruncated response"
            >
              <Download className="w-4 h-4 text-slate-500" />
            </button>
          )}
          <div className="text-xs text-slate-500">
            Round {response.round}
          </div>
        </div>
      </div>
      
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{response.content}</p>
      </div>
    </div>
  );
}