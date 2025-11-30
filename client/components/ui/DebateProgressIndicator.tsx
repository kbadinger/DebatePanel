'use client';

import { useState, useEffect } from 'react';
import { Loader2, Clock, CheckCircle, Circle, Users, Scale, BarChart3 } from 'lucide-react';
import { Model } from '@/types/debate';

type DebatePhase = 
  | 'initializing' 
  | 'round' 
  | 'waiting-human' 
  | 'analyzing' 
  | 'judge-review' 
  | 'completed';

type ModelStatus = 'pending' | 'thinking' | 'responding' | 'completed' | 'error';

interface ModelProgressInfo {
  model: Model;
  status: ModelStatus;
  responseTime?: number;
  errorMessage?: string;
}

interface DebateProgressProps {
  phase: DebatePhase;
  currentRound: number;
  totalRounds: number;
  models: Model[];
  modelStatuses?: Record<string, ModelStatus>;
  hasJudge?: boolean;
  isInteractive?: boolean;
  estimatedTimeRemaining?: number;
  completedModels?: number;
  startTime?: Date;
}

export function DebateProgressIndicator({
  phase,
  currentRound,
  totalRounds,
  models,
  modelStatuses = {},
  hasJudge = false,
  isInteractive = false,
  estimatedTimeRemaining,
  completedModels = 0,
  startTime
}: DebateProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);

  // Calculate overall progress percentage
  const calculateProgress = () => {
    const totalSteps = totalRounds + (hasJudge ? 2 : 1); // rounds + analysis + judge (optional)
    
    switch (phase) {
      case 'initializing':
        return 0;
      case 'round':
        const roundProgress = (currentRound - 1) / totalRounds;
        const currentRoundCompletion = completedModels / models.length * (1 / totalRounds);
        return Math.min(90, (roundProgress + currentRoundCompletion) * 100);
      case 'waiting-human':
        return ((currentRound - 1) / totalRounds) * 90;
      case 'analyzing':
        return 90;
      case 'judge-review':
        return 95;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  const progress = calculateProgress();

  // Generate phase description
  const getPhaseDescription = () => {
    switch (phase) {
      case 'initializing':
        return 'Initializing AI models and preparing debate environment...';
      case 'round':
        return `Round ${currentRound} of ${totalRounds} - AI models are analyzing and responding`;
      case 'waiting-human':
        return 'Waiting for your input to continue the debate';
      case 'analyzing':
        // Show elapsed time context for long debates
        if (elapsedTime > 900) { // More than 15 minutes
          return 'Debate is still running on the server. This may take a while for complex topics - checking status...';
        } else if (elapsedTime > 600) { // More than 10 minutes
          return 'Debate continuing on server (reconnecting in background)...';
        }
        return 'Analyzing debate responses and calculating statistical insights...';
      case 'judge-review':
        return 'Judge is reviewing all responses and preparing final verdict...';
      case 'completed':
        return 'Debate completed successfully!';
      default:
        return 'Processing...';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  // Create model progress info
  const modelProgress: ModelProgressInfo[] = models.map(model => ({
    model,
    status: modelStatuses[model.id] || 'pending'
  }));

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
      {/* Header with overall progress */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {phase === 'completed' ? (
            <CheckCircle className="text-green-600" size={24} />
          ) : (
            <Loader2 className="animate-spin text-blue-600" size={24} />
          )}
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {phase === 'completed' ? 'Debate Complete' : 'Debate in Progress'}
            </h3>
            <p className="text-sm text-slate-600">{getPhaseDescription()}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</div>
          <div className="text-xs text-slate-500">
            {startTime && (
              <div className="flex items-center gap-1">
                <Clock size={12} />
                {formatTime(elapsedTime)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Process Timeline */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs">
          <div className={`flex flex-col items-center gap-1 ${
            ['initializing', 'round', 'waiting-human', 'analyzing', 'judge-review', 'completed'].includes(phase) 
              ? 'text-blue-600' : 'text-slate-400'
          }`}>
            <div className={`w-3 h-3 rounded-full border-2 ${
              progress > 0 ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
            }`} />
            <span>Setup</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-slate-200 mx-2">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: progress >= 10 ? '100%' : '0%' }}
            />
          </div>
          
          <div className={`flex flex-col items-center gap-1 ${
            ['round', 'waiting-human', 'analyzing', 'judge-review', 'completed'].includes(phase)
              ? 'text-blue-600' : 'text-slate-400'
          }`}>
            <div className={`w-3 h-3 rounded-full border-2 ${
              progress > 10 ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
            }`} />
            <span>Debate</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-slate-200 mx-2">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: progress >= 90 ? '100%' : '0%' }}
            />
          </div>
          
          <div className={`flex flex-col items-center gap-1 ${
            ['analyzing', 'judge-review', 'completed'].includes(phase)
              ? 'text-blue-600' : 'text-slate-400'
          }`}>
            <div className={`w-3 h-3 rounded-full border-2 ${
              progress > 90 ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
            }`} />
            <span>Analysis</span>
          </div>
          
          {hasJudge && (
            <>
              <div className="flex-1 h-0.5 bg-slate-200 mx-2">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: progress >= 95 ? '100%' : '0%' }}
                />
              </div>
              
              <div className={`flex flex-col items-center gap-1 ${
                ['judge-review', 'completed'].includes(phase)
                  ? 'text-blue-600' : 'text-slate-400'
              }`}>
                <div className={`w-3 h-3 rounded-full border-2 ${
                  progress > 95 ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                }`} />
                <span>Judge</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Round Progress (only show during debate phase) */}
      {(phase === 'round' || phase === 'waiting-human') && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900">Round {currentRound} of {totalRounds}</h4>
            <div className="text-sm text-slate-600">
              {completedModels} of {models.length} models responded
            </div>
          </div>
          
          {/* Round Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedModels / models.length) * 100}%` }}
            />
          </div>
          
          {/* Model Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {modelProgress.map(({ model, status }) => (
              <div key={model.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'responding' ? 'bg-blue-500' :
                  status === 'thinking' ? 'bg-yellow-500' :
                  status === 'error' ? 'bg-red-500' :
                  'bg-slate-300'
                }`} />
                <span className="text-xs text-slate-700 truncate" title={model.displayName}>
                  {model.displayName}
                </span>
                {status === 'thinking' && (
                  <Loader2 size={12} className="animate-spin text-slate-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Mode Notice */}
      {isInteractive && phase === 'waiting-human' && (
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <Users className="text-purple-600" size={20} />
          <div>
            <p className="font-medium text-purple-900">Your Turn</p>
            <p className="text-sm text-purple-700">
              Please share your perspective to continue the debate
            </p>
          </div>
        </div>
      )}

      {/* Estimated Time (if available) */}
      {estimatedTimeRemaining && estimatedTimeRemaining > 0 && phase !== 'completed' && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mt-4 pt-4 border-t border-slate-200">
          <Clock size={14} />
          <span>Estimated time remaining: {formatTime(estimatedTimeRemaining)}</span>
        </div>
      )}
    </div>
  );
}