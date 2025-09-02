'use client';

import { useState, useEffect } from 'react';
import { Debate, DebateConfig, ModelResponse } from '@/types/debate';
import { ModelResponseCard } from './ModelResponseCard';
import { RatingsKey } from './RatingsKey';
import { HumanInputPanel } from './HumanInputPanel';
import { WinnerDisplay } from './WinnerDisplay';
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
      
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cleanConfig }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        clearTimeout(timeoutId);
        throw new Error(`Failed to start debate: ${response.status} ${response.statusText}`);
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
              console.log('Adding streaming response from:', data.data.modelId, 'round:', data.data.round);
              setStreamingResponses(prev => [...prev, data.data]);
            } else if (data.type === 'round-complete') {
              console.log('Round complete:', data.data.roundNumber, 'Adding to debate state');
              setCurrentRound(data.data.roundNumber);
              setStreamingResponses([]);
              
              // Update the debate object with the completed round
              setDebate(prevDebate => {
                const updatedDebate = {
                  ...prevDebate,
                  id: prevDebate?.id || `temp-${Date.now()}`,
                  status: 'running',
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
            } else if (data.type === 'debate-complete') {
              console.log('Debate completed - Full data:', JSON.stringify(data.data, null, 2));
              console.log('Debate status:', data.data.status);
              console.log('Has finalSynthesis:', !!data.data.finalSynthesis);
              console.log('Synthesis content:', data.data.finalSynthesis?.substring(0, 200));
              console.log('Has judgeAnalysis:', !!data.data.judgeAnalysis);
              console.log('Current debate state before update:', debate);
              
              // Merge completed debate with existing rounds data
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
              setIsRunning(false);
              
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
              alert(`Debate Error: ${data.data.message}\n\nPlease ensure all required API keys are configured.`);
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
        alert(`Failed to start debate: ${error.message}`);
      }
      setIsRunning(false);
      setDebate(null);
    }
  };
  
  const submitHumanInput = async (content: string, stance?: string, confidence?: number) => {
    if (!session?.user || !debate?.id) return;
    
    setIsSubmittingHuman(true);
    setWaitingForHuman(false);
    
    try {
      const response = await fetch('/api/debate/human-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debateId: debate.id,
          content,
          stance,
          confidence: confidence || 75,
          position: 'neutral' // This could be made dynamic based on UI
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
            } else if (data.type === 'round-complete') {
              setCurrentRound(data.data.roundNumber);
              setStreamingResponses([]);
            } else if (data.type === 'waiting-for-human') {
              setWaitingForHuman(true);
              setStreamingResponses([]);
            } else if (data.type === 'debate-complete') {
              console.log('Debate completed (2nd handler):', data.data);
              setDebate(data.data);
              setIsRunning(false);
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
  ];
  
  return (
    <div className="max-w-7xl mx-auto p-6">
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
      
      {/* Ratings Key - Horizontal at top */}
      <div className="mb-6">
        <RatingsKey />
      </div>
      
      <div className="space-y-4">
        {allResponses.map((response, idx) => (
          <ModelResponseCard
            key={`${response.modelId}-${response.round}-${idx}`}
            response={response}
            isStreaming={streamingResponses.includes(response)}
          />
        ))}
        
        {isRunning && allResponses.length > 0 && streamingResponses.length === 0 && !waitingForHuman && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={20} />
            <span className="text-sm font-medium text-slate-700">
              Waiting for next response...
            </span>
          </div>
        )}
        
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
      
      {isRunning && allResponses.length === 0 && (
        <div className="col-span-full mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 flex items-center justify-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <div>
              <p className="text-lg font-semibold text-slate-800">Starting Debate</p>
              <p className="text-sm text-slate-600">Initializing models...</p>
              {initTimeout && (
                <p className="text-sm text-amber-600 mt-2">
                  ⏱️ Models are taking longer than usual to respond. This can happen with complex topics or when models are under high load. Please wait...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Debug: Check debate state */}
      {(() => {
        console.log('Rendering check - debate:', {
          status: debate?.status,
          isRunning,
          hasSynthesis: !!debate?.finalSynthesis,
          synthesisLength: debate?.finalSynthesis?.length,
          rounds: debate?.rounds?.length
        });
        return null;
      })()}
      
      {(debate?.status === 'completed' || debate?.status === 'converged') && (
        <div className="space-y-8">
          {(() => {
            console.log('Rendering synthesis section');
            return null;
          })()}
          {/* Winner Display */}
          <WinnerDisplay debate={debate} />
          
          {/* Judge's Verdict */}
          {debate.judgeAnalysis && (
            <div className="mt-8 p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-xl">
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
          
          {/* Statistical Analysis - Always Second */}
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
          
          {/* Error fallback */}
          {!debate.finalSynthesis && !debate.judgeAnalysis && (
            <div className="mt-8 p-8 bg-gray-50 rounded-xl border-2 border-gray-200">
              <p className="text-slate-600">The debate has finished but no analysis was generated.</p>
              <pre className="mt-4 text-xs bg-slate-100 p-4 rounded">
                {JSON.stringify(debate, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="text-center mt-8 space-y-4">
            <div className="flex justify-center gap-4">
              <Button 
                onClick={handleDownloadFull}
                size="lg"
                variant="outline"
                className="shadow-lg border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Complete Debate
              </Button>
              <Button 
                onClick={() => window.location.href = '/'} 
                size="lg"
                className="shadow-lg"
              >
                Start New Debate
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Download includes full untruncated responses from all models
            </p>
          </div>
        </div>
      )}
    </div>
  );
}