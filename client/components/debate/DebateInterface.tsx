'use client';

import { useState, useEffect } from 'react';
import { Debate, DebateConfig, ModelResponse } from '@/types/debate';
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
  const [debug, setDebug] = useState(false);
  
  // Progress tracking state
  const [debatePhase, setDebatePhase] = useState<'initializing' | 'round' | 'waiting-human' | 'analyzing' | 'judge-review' | 'completed'>('initializing');
  const [modelStatuses, setModelStatuses] = useState<Record<string, 'pending' | 'thinking' | 'responding' | 'completed' | 'error'>>({});
  const [debateStartTime, setDebateStartTime] = useState<Date | null>(null);
  const [expectedModelsInRound, setExpectedModelsInRound] = useState<string[]>([]);

  
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
      
      // Use Railway service in production
      const apiUrl = process.env.NEXT_PUBLIC_RAILWAY_URL 
        ? `${process.env.NEXT_PUBLIC_RAILWAY_URL}/api/debate`
        : '/api/debate';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config: cleanConfig,
          userId: session?.user?.id // Pass user ID for Railway service
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        clearTimeout(timeoutId);
        
        // Parse error message if it's JSON
        let errorMessage = `Failed to start debate: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the text directly if it's not empty
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        clearTimeout(timeoutId);
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      
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
            
            if (data.type === 'response' && data.data) {
              console.log('Adding streaming response from:', data.data.modelId, 'round:', data.data.round);
              setStreamingResponses(prev => [...prev, data.data]);
              
              // Update model status to completed
              setModelStatuses(prev => ({
                ...prev,
                [data.data.modelId]: 'completed'
              }));
            } else if (data.type === 'round-complete' && data.data) {
              console.log('Round complete:', data.data.roundNumber, 'Adding to debate state');
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
              
              // Update the debate object with the completed round
              setDebate(prevDebate => {
                const updatedDebate = {
                  ...prevDebate,
                  id: prevDebate?.id || `temp-${Date.now()}`,
                  status: 'active' as const,
                  config: prevDebate?.config || config,
                  rounds: [
                    ...(prevDebate?.rounds || []),
                    data.data
                  ]
                };
                console.log('Updated debate with round:', data.data.roundNumber, 'Total rounds:', updatedDebate.rounds.length);
                return updatedDebate;
              });
            } else if (data.type === 'waiting-for-human') {
              setWaitingForHuman(true);
              setStreamingResponses([]);
              setDebatePhase('waiting-human');
            } else if (data.type === 'human-joined') {
              const participant = data.data as { userId: string; userName: string };
              setParticipants(prev => [...prev, participant]);
            } else if (data.type === 'debate-summary') {
              console.log('Debate summary received, full data follows...');
              // Update with summary data first
              setDebate(prevDebate => ({
                ...prevDebate,
                ...data.data,
                status: data.data.status || 'completed'
              }));
              
              // Move to judge phase if judge is enabled, otherwise analyzing
              if (config.judge?.enabled) {
                setDebatePhase('judge-review');
              } else {
                setDebatePhase('analyzing');
              }
            } else if (data.type === 'debate-complete' && data.data) {
              console.log('Debate completed - Full data:', JSON.stringify(data.data, null, 2));
              console.log('Debate status:', data.data?.status);
              console.log('Has finalSynthesis:', !!data.data?.finalSynthesis);
              console.log('Synthesis content:', data.data?.finalSynthesis?.substring(0, 200));
              console.log('Has judgeAnalysis:', !!data.data?.judgeAnalysis);
              console.log('Current debate state before update:', debate);
              
              // Merge completed debate with existing rounds data AND stop running in the same update
              setIsRunning(false);
              setDebatePhase('completed');
              setDebate(prevDebate => {
                const completedDebate = {
                  ...prevDebate,  // Keep existing rounds and config
                  ...data.data,   // Add final synthesis and judge analysis
                  status: data.data.status || 'completed'
                };
                console.log('Setting completed debate state');
                console.log('Preserved rounds:', completedDebate.rounds?.length);
                console.log('Has synthesis:', !!completedDebate.finalSynthesis);
                console.log('Has judge:', !!completedDebate.judgeAnalysis);
                return completedDebate;
              });
              
              // Add a small delay to ensure state updates and prevent race conditions
              setTimeout(() => {
                setDebate(prev => {
                  console.log('Final verification - debate status:', prev?.status, 'rounds:', prev?.rounds?.length);
                  return prev; // Just verify, don't overwrite
                });
              }, 100);
              
              onComplete?.(data.data);
              // Cancel the reader to close the stream
              reader.cancel();
              return; // Exit the function completely
            } else if (data.type === 'error') {
              console.error('Debate error:', data.data);
              const errorMessage = data.data?.message || data.data?.error || data.data || 'Unknown error occurred';
              alert(`Debate Error: ${errorMessage}\n\nPlease ensure all required API keys are configured.`);
              setIsRunning(false);
              reader.cancel();
              return; // Exit the function completely
            }
          }
        }
      }
    } catch (error) {
      console.error('Debate error:', error);
      clearTimeout(timeoutId);
      setInitTimeout(false);
      // Only show alert if it's not a normal closure
      if (error instanceof Error && !error.message.includes('eventSource')) {
        const message = error.message || 'Unknown error occurred';
        alert(`Failed to start debate: ${message}`);
      } else if (typeof error === 'string') {
        alert(`Failed to start debate: ${error}`);
      } else {
        alert('Failed to start debate: Cannot connect to debate service. Please try again later.');
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
      // Use Railway service in production
      const apiUrl = process.env.NEXT_PUBLIC_RAILWAY_URL 
        ? `${process.env.NEXT_PUBLIC_RAILWAY_URL}/api/debate/human-input`
        : '/api/debate/human-input';
      
      const response = await fetch(apiUrl, {
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
              setDebate(data.data);
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 text-center bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">{config.topic}</h1>
        {config.description && (
          <p className="text-gray-800 text-base max-w-4xl mx-auto whitespace-pre-wrap leading-relaxed font-medium">
            {config.description}
          </p>
        )}
        <button 
          onClick={() => setDebug(!debug)}
          className="mt-4 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        >
          {debug ? 'Hide Debug' : 'Show Debug'}
        </button>
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
      
      {/* Debug: Force show synthesis if it exists */}
      {debug && debate?.finalSynthesis && (
        <div className="mb-8 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <h3 className="font-bold">DEBUG: Found Synthesis Data</h3>
          <p>Status: {debate.status}</p>
          <p>Length: {debate.finalSynthesis.length} chars</p>
          <div className="mt-2 p-2 bg-white rounded text-xs">
            <pre>{debate.finalSynthesis.substring(0, 500)}...</pre>
          </div>
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
          completedModels={Object.values(modelStatuses).filter(status => status === 'completed').length}
          startTime={debateStartTime || undefined}
        />
      )}

      {/* Ratings Key - Always show if we have rounds */}
      {(debate?.rounds && debate.rounds.length > 0) && (
        <div className="mb-6">
          <RatingsKey />
        </div>
      )}
      
      
      <div className="space-y-4">
        {allResponses.map((response, idx) => (
          <ModelResponseCard
            key={`${response.modelId}-${response.round}-${idx}`}
            response={response}
            isStreaming={streamingResponses.includes(response)}
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
      

      
      {/* Debug: Check debate state */}
      {(() => {
        const debugData = {
          status: debate?.status,
          isRunning,
          hasSynthesis: !!debate?.finalSynthesis,
          synthesisLength: debate?.finalSynthesis?.length,
          synthesisPreview: debate?.finalSynthesis?.substring(0, 100),
          rounds: debate?.rounds?.length,
          showingFinalResults: (debate?.status === 'completed' || debate?.status === 'converged'),
          finalResultsCondition: `(${debate?.status} === 'completed' || ${debate?.status} === 'converged') = ${(debate?.status === 'completed' || debate?.status === 'converged')}`
        };
        console.log('Rendering check - debate:', debugData);
        
        // Also show on screen for debugging
        if (debug) {
          return (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
              <h3>Debug Info:</h3>
              <pre>{JSON.stringify(debugData, null, 2)}</pre>
            </div>
          );
        }
        return null;
      })()}
      

    </div>
  );
}