'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Debate } from '@/types/debate';
import { ModelResponseCard } from '@/components/debate/ModelResponseCard';
import { WinnerDisplay } from '@/components/debate/WinnerDisplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DebateViewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debateId = params.id as string;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/debate/${debateId}`);
    }
  }, [status, router, debateId]);

  useEffect(() => {
    if (session && debateId) {
      fetchDebate();
    }
  }, [session, debateId]);

  const fetchDebate = async () => {
    try {
      const response = await fetch(`/api/debate?debateId=${debateId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Debate not found');
        } else {
          setError('Failed to load debate');
        }
        return;
      }
      
      const data = await response.json();
      
      // Transform database format to client format
      const transformedDebate: Debate = {
        id: data.id,
        config: {
          topic: data.topic,
          description: data.description,
          models: data.modelSelections.map((ms: { modelId: string; provider: string; name: string }) => ({
            id: ms.modelId,
            provider: ms.provider,
            name: ms.name,
            displayName: ms.name
          })),
          rounds: data.rounds,
          format: data.format || 'structured',
          style: 'consensus-seeking', // Default for existing debates
          judge: {
            enabled: !!data.judgeAnalysis
          }
        },
        rounds: data.debateRounds.map((round: { roundNumber: number; responses: Array<{ modelId: string; content: string; position: string; confidence: number; createdAt: string; stance?: string; consensusAlignment?: string }> }) => ({
          roundNumber: round.roundNumber,
          responses: round.responses.map((response: { modelId: string; content: string; position: string; confidence: number; createdAt: string; stance?: string; consensusAlignment?: string }) => ({
            modelId: response.modelId,
            round: round.roundNumber,
            content: response.content,
            position: response.position,
            confidence: response.confidence,
            timestamp: new Date(response.createdAt),
            stance: response.stance,
            consensusAlignment: response.consensusAlignment
          })),
          consensus: (round as any).consensus,
          keyDisagreements: (round as any).keyDisagreements
        })),
        status: data.status,
        createdAt: new Date(data.createdAt),
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        finalSynthesis: data.finalSynthesis,
        judgeAnalysis: data.judgeAnalysis,
        winner: data.winnerId ? {
          id: data.winnerId,
          name: data.winnerName,
          type: data.winnerType,
          reason: data.victoryReason
        } : undefined
      };
      
      setDebate(transformedDebate);
    } catch (err) {
      console.error('Error fetching debate:', err);
      setError('Failed to load debate');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `DebatePanel: ${debate?.config.topic}`,
        text: 'Check out this AI debate analysis',
        url: window.location.href,
      });
    } catch (err) {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    if (!debate) return;
    
    const debateData = {
      topic: debate.config.topic,
      description: debate.config.description,
      models: debate.config.models.map(m => m.displayName),
      rounds: debate.rounds.map(round => ({
        round: round.roundNumber,
        responses: round.responses.map(r => ({
          model: r.modelId,
          stance: r.stance,
          confidence: r.confidence,
          content: r.content
        }))
      })),
      finalSynthesis: debate.finalSynthesis,
      judgeAnalysis: debate.judgeAnalysis,
      winner: debate.winner
    };
    
    const blob = new Blob([JSON.stringify(debateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debate-${debate.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
          <p className="text-slate-600">Loading debate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-slate-100 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Debate Not Found</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link href="/history">
            <Button className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!debate) {
    return null;
  }

  const allResponses = debate.rounds.flatMap(r => r.responses);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/history">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Debate Header */}
        <div className="mb-8 text-center bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <h1 className="text-3xl font-bold mb-4 text-gray-900">{debate.config.topic}</h1>
          {debate.config.description && (
            <p className="text-gray-800 text-base max-w-4xl mx-auto whitespace-pre-wrap leading-relaxed font-medium">
              {debate.config.description}
            </p>
          )}
          <div className="flex justify-center items-center gap-4 mt-4 text-sm text-slate-600">
            <span>{debate.rounds.length} rounds</span>
            <span>•</span>
            <span>{debate.config.models.length} models</span>
            <span>•</span>
            <span>{new Date(debate.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              debate.status === 'completed' ? 'bg-green-100 text-green-800' :
              debate.status === 'converged' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {debate.status}
            </span>
          </div>
        </div>

        {/* Debate Responses */}
        <div className="space-y-4 mb-8">
          {allResponses.map((response, idx) => (
            <ModelResponseCard
              key={`${response.modelId}-${response.round}-${idx}`}
              response={response}
            />
          ))}
        </div>

        {/* Results Section */}
        {debate.status === 'completed' && (
          <div className="space-y-8">
            {/* Winner Display */}
            <WinnerDisplay debate={debate} />
            
            {/* Judge's Verdict */}
            {debate.judgeAnalysis && (
              <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-xl">
                <h2 className="text-2xl font-bold mb-4 text-purple-900">⚖️ Judge&apos;s Verdict</h2>
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
            
            {/* Statistical Analysis */}
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
          </div>
        )}
      </div>
    </div>
  );
}