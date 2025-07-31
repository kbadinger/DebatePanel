'use client';

import { useState, useEffect } from 'react';
import { Debate, DebateConfig, ModelResponse } from '@/types/debate';
import { ModelResponseCard } from './ModelResponseCard';
import { RatingsKey } from './RatingsKey';
import { HumanInputPanel } from './HumanInputPanel';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface DebateInterfaceProps {
  config: DebateConfig;
  onComplete?: (debate: Debate) => void;
}

export function DebateInterface({ config, onComplete }: DebateInterfaceProps) {
  const { data: session } = useSession();
  const [debate, setDebate] = useState<Debate | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [streamingResponses, setStreamingResponses] = useState<ModelResponse[]>([]);
  const [waitingForHuman, setWaitingForHuman] = useState(false);
  const [isSubmittingHuman, setIsSubmittingHuman] = useState(false);
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
  
  const startDebate = async () => {
    if (isRunning) {
      console.log('Debate already running, skipping...');
      return;
    }
    
    setIsRunning(true);
    setCurrentRound(1);
    
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
        throw new Error(`Failed to start debate: ${response.status} ${response.statusText}`);
      }
      
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
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'response') {
              setStreamingResponses(prev => [...prev, data.data]);
            } else if (data.type === 'round-complete') {
              setCurrentRound(data.data.roundNumber);
              setStreamingResponses([]);
            } else if (data.type === 'waiting-for-human') {
              setWaitingForHuman(true);
              setStreamingResponses([]);
            } else if (data.type === 'human-joined') {
              const participant = data.data as { userId: string; userName: string };
              setParticipants(prev => [...prev, participant]);
            } else if (data.type === 'debate-complete') {
              console.log('Debate completed:', data.data);
              setDebate(data.data);
              onComplete?.(data.data);
            } else if (data.type === 'error') {
              console.error('Debate error:', data.data);
              alert(`Debate Error: ${data.data.message}\n\nPlease ensure all required API keys are configured.`);
              setIsRunning(false);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Debate error:', error);
    } finally {
      setIsRunning(false);
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
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'response') {
              setStreamingResponses(prev => [...prev, data.data]);
            } else if (data.type === 'round-complete') {
              setCurrentRound(data.data.roundNumber);
              setStreamingResponses([]);
            } else if (data.type === 'waiting-for-human') {
              setWaitingForHuman(true);
              setStreamingResponses([]);
            } else if (data.type === 'debate-complete') {
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
    ...(debate?.rounds.flatMap(r => r.responses) || []),
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
              <p className="text-sm text-purple-700">You'll be prompted to share your perspective after the AI models respond</p>
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
        
        {isRunning && allResponses.length > 0 && streamingResponses.length === 0 && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={20} />
            <span className="text-sm font-medium text-slate-700">
              Waiting for next response...
            </span>
          </div>
        )}
      </div>
      
      {!debate && !isRunning && (
        <div className="text-center py-16 col-span-full">
          <div className="text-slate-600">
            <p>Preparing debate...</p>
          </div>
        </div>
      )}
      
      {isRunning && allResponses.length === 0 && (
        <div className="col-span-full mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 flex items-center justify-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <div>
              <p className="text-lg font-semibold text-slate-800">Processing Debate</p>
              <p className="text-sm text-slate-600">Round {currentRound} of {config.rounds}</p>
            </div>
          </div>
        </div>
      )}
      
      {debate?.status === 'completed' && (
        <div className="space-y-8">
          {/* Judge's Verdict - Always First */}
          {debate.judgeAnalysis && (
            <div className="mt-8 p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-xl">
              <h2 className="text-2xl font-bold mb-4 text-purple-900">⚖️ Judge's Verdict</h2>
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
              <h2 className="text-2xl font-bold mb-4 text-blue-900">📊 {debate.judgeAnalysis ? 'Statistical Analysis' : 'Debate Results'}</h2>
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
          
          <div className="text-center mt-8">
            <Button 
              onClick={() => window.location.href = '/'} 
              size="lg"
              className="shadow-lg"
            >
              Start New Debate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}