'use client';

import { useState, useEffect } from 'react';
import { Debate, DebateConfig, DebateRound, DebateStatus, ModelResponse } from '@/types/debate';
import { ModelResponseCard } from './ModelResponseCard';
import { RatingsKey } from './RatingsKey';
import { HumanInputPanel } from './HumanInputPanel';
import { WinnerDisplay } from './WinnerDisplay';
import { DebateProgressIndicator } from '@/components/ui/DebateProgressIndicator';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Copy, Check, Download } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState as useStateCopy } from 'react';

interface DebateInterfaceProps {
  config: DebateConfig;
  onComplete?: (debate: Debate) => void;
}

export function DebateInterface({ config, onComplete }: DebateInterfaceProps) {
  const { data: session } = useSession();
  const [debate, setDebate] = useState<Debate | null>(null);
  const [copiedSynthesis, setCopiedSynthesis] = useStateCopy(false);
  const [copiedJudge, setCopiedJudge] = useStateCopy(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [initTimeout, setInitTimeout] = useState(false);
  const [streamingResponses, setStreamingResponses] = useState<ModelResponse[]>([]);
  const [waitingForHuman, setWaitingForHuman] = useState(false);
  const [isSubmittingHuman, setIsSubmittingHuman] = useState(false);
  
  // Progress tracking state
  const [debatePhase, setDebatePhase] = useState<'initializing' | 'round' | 'waiting-human' | 'analyzing' | 'judge-review' | 'completed'>('initializing');
  const [modelStatuses, setModelStatuses] = useState<Record<string, 'pending' | 'thinking' | 'responding' | 'completed' | 'error'>>({});
  const [debateStartTime, setDebateStartTime] = useState<Date | null>(null);
  const [expectedModelsInRound, setExpectedModelsInRound] = useState<string[]>([]);

  const normalizeRound = (round: any): DebateRound => {
    const roundNumber = typeof round?.roundNumber === 'number'
      ? round.roundNumber
      : typeof round?.round === 'number'
        ? round.round
        : Number.parseInt(round?.roundNumber ?? round?.round ?? '0', 10) || 0;

    const responses: ModelResponse[] = Array.isArray(round?.responses)
      ? round.responses.map((response: any): ModelResponse => ({
          modelId: response?.modelId ?? response?.model_id ?? 'unknown-model',
          round: roundNumber,
          content: response?.content ?? '',
          position: response?.position ?? 'neutral',
          confidence: typeof response?.confidence === 'number' ? response.confidence : 0,
          timestamp: response?.createdAt ? new Date(response.createdAt) : new Date(),
          stance: response?.stance,
          consensusAlignment: response?.consensusAlignment,
          isHuman: response?.isHuman ?? false,
          userId: response?.userId ?? response?.user_id,
          userName: response?.userName ?? response?.user_name
        }))
      : [];

    return {
      roundNumber,
      responses,
      consensus: round?.consensus ?? undefined,
      keyDisagreements: Array.isArray(round?.keyDisagreements) ? round.keyDisagreements : undefined
    };
  };

  const normalizeRoundsData = (candidate: any, fallback?: DebateRound[]): DebateRound[] => {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeRound).filter(round => round.responses.length > 0);
    }

    if (candidate && typeof candidate === 'object') {
      return Object.values(candidate).map(normalizeRound).filter(round => round.responses.length > 0);
    }

    return fallback ? fallback.map(normalizeRound) : [];
  };

  const extractRoundsFromPayload = (payload: any, prevRounds?: DebateRound[]): DebateRound[] => {
    if (!payload) {
      return prevRounds ? prevRounds.map(normalizeRound) : [];
    }

    const { rounds, debateRounds } = payload;

    if (Array.isArray(rounds)) {
      return normalizeRoundsData(rounds);
    }

    if (Array.isArray(debateRounds)) {
      return normalizeRoundsData(debateRounds);
    }

    if (rounds && typeof rounds === 'object') {
      return normalizeRoundsData(Object.values(rounds));
    }

    if (debateRounds && typeof debateRounds === 'object') {
      return normalizeRoundsData(Object.values(debateRounds));
    }

    return prevRounds ? prevRounds.map(normalizeRound) : [];
  };

  
  const handleCopySynthesis = async () => {
    if (debate?.finalSynthesis) {
      const plainText = debate.finalSynthesis
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/^##+ /gm, '');
      await navigator.clipboard.writeText(plainText);
      setCopiedSynthesis(true);
      setTimeout(() => setCopiedSynthesis(false), 2000);
    }
  };
  
  const handleCopyJudge = async () => {
    if (debate?.judgeAnalysis) {
      const plainText = debate.judgeAnalysis
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1');
      await navigator.clipboard.writeText(plainText);
      setCopiedJudge(true);
      setTimeout(() => setCopiedJudge(false), 2000);
    }
  };

  const handleDownloadFull = async () => {
    if (!debate?.id) return;
    
    try {
      const response = await fetch(`/api/debate/${debate.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debate-${debate.id}-full.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download full debate');
    }
  };
  const [participants, setParticipants] = useState<Array<{ userId: string; userName: string }>>([]);
  


  // Auto-start debate when component mounts
  useEffect(() => {
    let mounted = true;
    
    const initDebate = async () => {
      if (mounted && !isRunning && !debate) {
        await startDebate();
      }
    };
    
    initDebate();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  // Monitor debate state changes
  useEffect(() => {
    console.log('Debate state changed:', {
      status: debate?.status,
      hasSynthesis: !!debate?.finalSynthesis,
      hasJudgeAnalysis: !!debate?.judgeAnalysis,
      rounds: debate?.rounds?.length
    });
  }, [debate]);
  
  const startDebate = async () => {
    if (isRunning) {
      console.log('Debate already running, skipping...');
      return;
    }
    
    console.log('Starting new debate, clearing previous state');
    setDebate(null); // Clear any previous debate
    setIsRunning(true);
    setCurrentRound(1);
    setInitTimeout(false);
    
    // Initialize progress tracking
    setDebatePhase('initializing');
    setDebateStartTime(new Date());
    setModelStatuses({});
    setExpectedModelsInRound(config.models.map(m => m.id));
    
    // Set a timeout to show a message if initialization takes too long
    const timeoutId = setTimeout(() => {
      setInitTimeout(true);
    }, 30000); // Show message after 30 seconds
    
    try {
      console.log('Starting debate with config:', config);
      
      // Clean up models to remove costInfo before sending
      const cleanConfig = {
        ...config,
        models: config.models.map(({ id, provider, name, displayName }) => ({
          id,
          provider,
          name,
          displayName
        })),
        judge: config.judge?.enabled && config.judge.model ? {
          enabled: true,
          model: {
            id: config.judge.model.id,
            provider: config.judge.model.provider,
            name: config.judge.model.name,
            displayName: config.judge.model.displayName
          }
        } : undefined
      };
      
      // Always use local Next.js API (returns JSON, handles Railway internally if needed)
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config: cleanConfig,
          userId: session?.user?.id // Pass user ID for Railway service
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        clearTimeout(timeoutId);
        throw new Error(errorData.error || `Failed to start debate: ${response.status}`);
      }

      // New polling-based architecture: POST returns immediately with debateId
      const { debateId } = await response.json();
      console.log('Debate started with ID:', debateId);

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      setInitTimeout(false);

      // Start first round
      setDebatePhase('round');
      setCurrentRound(1);

      // Initialize all models as pending for round 1
      const initialStatuses: Record<string, 'pending' | 'thinking' | 'responding' | 'completed' | 'error'> = {};
      config.models.forEach(model => {
        initialStatuses[model.id] = 'thinking';
      });
      setModelStatuses(initialStatuses);

      // Poll for debate status updates
      const pollInterval = 3000; // 3 seconds
      const maxAttempts = 600; // 30 minutes max (600 * 3s)
      let attempts = 0;
      let lastRoundSeen = 0;

      while (attempts < maxAttempts) {
        try {
          const statusResponse = await fetch(`/api/debate/${debateId}/status`);

          if (!statusResponse.ok) {
            console.warn('Status poll failed:', statusResponse.status);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;
            continue;
          }

          const status = await statusResponse.json();
          console.log(`Poll ${attempts + 1}: status=${status.status}, round=${status.currentRound}/${status.totalRounds}`);
          console.log('[DebateInterface] Rounds with consensus:', status.rounds?.map((r: any) => ({
            roundNumber: r.roundNumber,
            hasConsensus: !!r.consensus,
            consensusPreview: r.consensus?.substring(0, 50)
          })));

          // Update current round if changed
          if (status.currentRound > lastRoundSeen) {
            lastRoundSeen = status.currentRound;
            setCurrentRound(status.currentRound);

            // Update model statuses for new round
            const roundStatuses: Record<string, 'pending' | 'thinking' | 'responding' | 'completed' | 'error'> = {};
            config.models.forEach(model => {
              roundStatuses[model.id] = 'thinking';
            });
            setModelStatuses(roundStatuses);

            // Update phase
            if (status.currentRound === status.totalRounds) {
              setDebatePhase('analyzing');
            } else {
              setDebatePhase('round');
            }
          }

          // Update debate state with rounds as they complete
          if (status.rounds && status.rounds.length > 0) {
            setDebate({
              id: debateId,
              config,
              rounds: status.rounds,
              currentRound: status.currentRound || 0,
              status: (status.status || 'running') as DebateStatus,
              createdAt: new Date(),
            });

            // Mark models as completed for completed rounds
            const latestRound = status.rounds[status.rounds.length - 1];
            if (latestRound?.responses) {
              const completedStatuses: Record<string, 'pending' | 'thinking' | 'responding' | 'completed' | 'error'> = {};
              latestRound.responses.forEach((r: { modelId: string }) => {
                completedStatuses[r.modelId] = 'completed';
              });
              setModelStatuses(prev => ({ ...prev, ...completedStatuses }));
            }
          }

          // Handle completed/failed states
          if (status.status === 'completed' || status.status === 'converged') {
            console.log('Debate completed via polling!');
            setIsRunning(false);
            setDebatePhase('completed');
            setDebate(prevDebate => {
              const roundsData = extractRoundsFromPayload(status, prevDebate?.rounds);
              return {
                ...prevDebate,
                ...status,
                rounds: roundsData,
                debateRounds: undefined,
                status: status.status
              };
            });
            onComplete?.(status);
            break;
          }

          if (status.status === 'failed') {
            console.error('Debate failed:', status.errorMessage);
            alert(`Debate failed: ${status.errorMessage || 'Unknown error'}`);
            setIsRunning(false);
            setDebatePhase('completed');
            break;
          }

          if (status.status === 'waiting-for-human') {
            setWaitingForHuman(true);
            setDebatePhase('waiting-human');
            break;
          }

          await new Promise(resolve => setTimeout(resolve, pollInterval));
          attempts++;

        } catch (pollError) {
          console.error('Polling error:', pollError);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }

      if (attempts >= maxAttempts) {
        console.error('Polling timeout - debate may still be running');
        alert('Debate is taking longer than expected. Check your debate history later.');
        setIsRunning(false);
      }

    } catch (error) {
      console.error('Debate error:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        toString: error?.toString?.()
      });
      
      clearTimeout(timeoutId);
      setInitTimeout(false);
      
      // Determine error message
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message || 'Connection failed';
        // Check for specific error types
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to debate service. The service may be restarting. Please try again in a moment.';
        } else if (error.message.includes('CORS')) {
          errorMessage = 'Cross-origin request blocked. Please wait for the service to update and try again.';
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      // Only show alert if it's not a normal closure
      if (!errorMessage.includes('eventSource')) {
        alert(`Failed to start debate: ${errorMessage}`);
      }
      
      setIsRunning(false);
      setDebate(null);
    }
  };
  
  const submitHumanInput = async (content: string, stance?: string, confidence?: number) => {
    if (!session?.user || !debate?.id) return;
    
    setIsSubmittingHuman(true);
    setWaitingForHuman(false);
    setDebatePhase('round'); // Back to round phase after human input
    
    // Reset model statuses for next responses
    const nextRoundStatuses: Record<string, 'pending' | 'thinking' | 'responding' | 'completed' | 'error'> = {};
    config.models.forEach(model => {
      nextRoundStatuses[model.id] = 'thinking';
    });
    setModelStatuses(nextRoundStatuses);
    
    try {
      // Always use local Next.js API
      const response = await fetch('/api/debate/human-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debateId: debate.id,
          content,
          stance,
          confidence: confidence || 75,
          position: 'neutral', // This could be made dynamic based on UI
          userId: session?.user?.id,
          userName: session?.user?.name || session?.user?.email
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit human input');
      }
      
      // The response will continue the debate stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            console.log('Received SSE line length:', line.length, 'Preview:', line.substring(0, 100) + '...');
            let data;
            try {
              data = JSON.parse(line.slice(6));
              console.log('Successfully parsed SSE data type:', data.type);
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              console.error('Failed to parse line:', line);
              continue;
            }
            
            if (data.type === 'response') {
              setStreamingResponses(prev => [...prev, data.data]);
              // Update model status to completed
              setModelStatuses(prev => ({
                ...prev,
                [data.data.modelId]: 'completed'
              }));
            } else if (data.type === 'round-complete') {
              setCurrentRound(data.data.roundNumber);
              setStreamingResponses([]);
              // Reset model statuses for next round if not final round
              if (data.data.roundNumber < config.rounds) {
                const nextRoundStatuses: Record<string, 'pending' | 'thinking' | 'responding' | 'completed' | 'error'> = {};
                config.models.forEach(model => {
                  nextRoundStatuses[model.id] = 'thinking';
                });
                setModelStatuses(nextRoundStatuses);
              } else {
                // Final round complete, moving to analysis
                setDebatePhase('analyzing');
              }
            } else if (data.type === 'waiting-for-human') {
              setWaitingForHuman(true);
              setStreamingResponses([]);
              setDebatePhase('waiting-human');
            } else if (data.type === 'debate-complete') {
              console.log('Debate completed (2nd handler):', data.data);
              setIsRunning(false);
              setDebatePhase('completed');
              // Merge with existing debate to preserve rounds
              setDebate(prevDebate => {
                return {
                  ...prevDebate,
                  ...data.data,
                  rounds: extractRoundsFromPayload(data.data, prevDebate?.rounds),
                  debateRounds: undefined,
                  status: 'completed'
                };
              });
              onComplete?.(data.data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error submitting human input:', error);
      alert('Failed to submit your response. Please try again.');
      setWaitingForHuman(true);
    } finally {
      setIsSubmittingHuman(false);
    }
  };
  
  const allResponses = [
    ...(debate?.rounds?.flatMap(r => r?.responses || []) || []),
    ...streamingResponses
  ].reverse(); // Newest responses at top
  
  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto p-6">
      <div className="mb-8 text-center bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">{config.topic}</h1>
        {config.description && (
          <p className="text-gray-800 text-base max-w-4xl mx-auto whitespace-pre-wrap leading-relaxed font-medium">
            {config.description}
          </p>
        )}
      </div>
      
      {/* Interactive Mode Banner */}
      {config.isInteractive && (
        <div className="mb-6 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 border border-purple-300">
          <div className="flex items-center gap-3">
            <Users className="text-purple-600" size={24} />
            <div>
              <h3 className="font-semibold text-purple-900">Interactive Debate Mode</h3>
              <p className="text-sm text-purple-700">You&apos;ll be prompted to share your perspective after the AI models respond</p>
            </div>
          </div>
          {participants.length > 0 && (
            <div className="mt-3 text-sm text-purple-700">
              Participants: {participants.map(p => p.userName).join(', ')}
            </div>
          )}
        </div>
      )}
      
      {/* Final Results - Show when we have synthesis (primary condition) */}
      {(debate?.finalSynthesis && (debate?.status === 'completed' || debate?.status === 'converged' || debate?.rounds?.length > 0)) && (
        <div className="space-y-8 mb-8">
          {/* Winner/Leading Contributor - First */}
          <WinnerDisplay debate={debate} />
          
          {/* Judge's Verdict - Second */}
          {debate.judgeAnalysis && (
            <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-purple-900">⚖️ Judge&apos;s Verdict</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyJudge}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Copy judge's verdict"
                  >
                    {copiedJudge ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-purple-600" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadFull}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    title="Download complete debate with full untruncated responses"
                  >
                    <Download className="w-4 h-4" />
                    Download Full Debate
                  </button>
                </div>
              </div>
              <div className="prose prose-slate max-w-none">
                <div 
                  className="text-slate-800 text-lg leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: debate.judgeAnalysis
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
                      .replace(/^- (.*?)$/gm, '<div class="ml-4 mb-2">• $1</div>')
                      .replace(/^\d+\. (.*?)$/gm, '<div class="ml-4 mb-2">$&</div>')
                      .replace(/\n/g, '<br/>')
                  }} />
              </div>
            </div>
          )}


          
          {/* Statistical Analysis - Third */}
          {debate.finalSynthesis && (
            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-blue-900">📊 {debate.judgeAnalysis ? 'Statistical Analysis' : 'Debate Results'}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopySynthesis}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Copy synthesis"
                  >
                    {copiedSynthesis ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadFull}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Download full debate (untruncated responses)"
                  >
                    <Download className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              </div>
              <div className="prose prose-slate max-w-none">
                <div 
                  className="text-slate-800"
                  dangerouslySetInnerHTML={{ 
                    __html: debate.finalSynthesis
                      .replace(/^## (.*?)$/gm, '<h3 class="text-xl font-bold mb-3 text-slate-900 mt-6">$1</h3>')
                      .replace(/^### (.*?)$/gm, '<h4 class="text-lg font-semibold mb-2 text-slate-800 mt-4">$1</h4>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
                      .replace(/^• (.*?)$/gm, '<div class="ml-4 mb-1">• $1</div>')
                      .replace(/^\d+\. (.*?)$/gm, '<div class="ml-4 mb-1">$&</div>')
                      .replace(/\n/g, '<br/>')
                  }} />
              </div>
            </div>
          )}
          
          {/* Final Action Buttons */}
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-4">
              <button
                onClick={handleDownloadFull}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-lg"
              >
                <Download className="w-5 h-5" />
                Download Complete Debate
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-lg"
              >
                Start New Debate
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Download includes full untruncated responses from all models
            </p>
          </div>
        </div>
      )}

      {/* Progress Indicator - Show during debate process */}
      {(isRunning || debatePhase !== 'completed') && (
        <DebateProgressIndicator
          phase={debatePhase}
          currentRound={currentRound}
          totalRounds={config.rounds}
          models={config.models}
          modelStatuses={modelStatuses}
          hasJudge={config.judge?.enabled || false}
          isInteractive={config.isInteractive || false}
          completedModels={config.models.filter(m => modelStatuses[m.id] === 'completed').length}
          startTime={debateStartTime || undefined}
        />
      )}

      {/* Ratings Key - Always show if we have rounds */}
      {(debate?.rounds && debate.rounds.length > 0) && (
        <div className="mb-6">
          <RatingsKey />
        </div>
      )}
      
      
      <div className="space-y-6">
        {/* Display rounds chronologically with proper order: Responses → Synthesis → Challenger */}
        {debate?.rounds?.map((round) => {
          // Separate regular responses from Challenger
          const regularResponses = round.responses?.filter(r => !r.modelId.startsWith('challenger-')) || [];
          const challengerResponse = round.responses?.find(r => r.modelId.startsWith('challenger-'));

          return (
            <div key={round.roundNumber} className="space-y-4">
              {/* Round Header */}
              <h3 className="text-lg font-semibold text-slate-700 border-b pb-2">
                Round {round.roundNumber}
              </h3>

              {/* 1. Model Responses (not Challenger) */}
              {regularResponses.map((response, idx) => (
                <ModelResponseCard
                  key={`${response.modelId}-${round.roundNumber}-${idx}`}
                  response={response}
                  isStreaming={streamingResponses.includes(response)}
                  debateId={debate?.id}
                />
              ))}

              {/* 2. Round Synthesis */}
              {round.consensus && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    📊 Round {round.roundNumber} Synthesis
                  </h4>
                  <p className="text-blue-800 text-sm leading-relaxed">{round.consensus}</p>
                </div>
              )}

              {/* 3. Challenger (after synthesis, but NOT on final round) */}
              {challengerResponse && round.roundNumber < (debate?.rounds?.length || 0) && (
                <ModelResponseCard
                  key={`challenger-${round.roundNumber}`}
                  response={challengerResponse}
                  isStreaming={streamingResponses.includes(challengerResponse)}
                  debateId={debate?.id}
                />
              )}
            </div>
          );
        })}

        {/* Streaming responses (not yet assigned to a round) */}
        {streamingResponses.filter(r => !debate?.rounds?.some(round =>
          round.responses?.some(resp => resp.modelId === r.modelId && resp.round === r.round)
        )).map((response, idx) => (
          <ModelResponseCard
            key={`streaming-${response.modelId}-${response.round}-${idx}`}
            response={response}
            isStreaming={true}
            debateId={debate?.id}
          />
        ))}

        {/* Human Input Panel */}
        {waitingForHuman && config.isInteractive && (
          <HumanInputPanel
            onSubmit={submitHumanInput}
            isSubmitting={isSubmittingHuman}
            currentRound={currentRound}
            totalRounds={config.rounds}
          />
        )}
      </div>
      
      {!debate && !isRunning && (
        <div className="text-center py-16 col-span-full">
          <div className="text-slate-600">
            <p>Preparing debate...</p>
            <p className="text-sm mt-2">If this persists, check the browser console for errors</p>
          </div>
        </div>
      )}
      


    </div>
  );
}