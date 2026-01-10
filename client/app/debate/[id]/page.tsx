'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Debate, ModelResponse } from '@/types/debate';
import { ModelResponseCard } from '@/components/debate/ModelResponseCard';
import { WinnerDisplay } from '@/components/debate/WinnerDisplay';
import { HumanInputPanel } from '@/components/debate/HumanInputPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share, Download, Loader2, Globe, Lock, Copy, Check } from 'lucide-react';
import Link from 'next/link';

export default function DebateViewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingHuman, setIsSubmittingHuman] = useState(false);
  const [streamingResponses, setStreamingResponses] = useState<ModelResponse[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const debateId = params.id as string;
  const isWaitingForHuman = debate?.status === 'waiting-for-human';
  const currentRound = (debate?.rounds?.length || 0) + 1;
  const totalRounds = debate?.config?.rounds || 3;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/debate/${debateId}`);
    }
  }, [status, router, debateId]);

  useEffect(() => {
    if (session && debateId) {
      fetchDebate();
      checkAdminAndPublicStatus();
    }
  }, [session, debateId]);

  const checkAdminAndPublicStatus = async () => {
    try {
      // Check admin status
      const adminRes = await fetch('/api/admin/check');
      if (adminRes.ok) {
        const { isAdmin: adminStatus } = await adminRes.json();
        setIsAdmin(adminStatus);
      }

      // Check public status
      const publicRes = await fetch(`/api/debate/public?debateId=${debateId}`);
      if (publicRes.ok) {
        const { isPublic: pubStatus, publicSlug: slug } = await publicRes.json();
        setIsPublic(pubStatus);
        setPublicSlug(slug);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  const togglePublic = async () => {
    setTogglingPublic(true);
    try {
      const res = await fetch('/api/debate/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debateId,
          isPublic: !isPublic
        })
      });

      if (res.ok) {
        const { debate: updated } = await res.json();
        setIsPublic(updated.isPublic);
        setPublicSlug(updated.publicSlug);
      }
    } catch (err) {
      console.error('Error toggling public:', err);
    } finally {
      setTogglingPublic(false);
    }
  };

  const copyPublicLink = async () => {
    if (publicSlug) {
      const url = `${window.location.origin}/d/${publicSlug}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

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
          style: data.style || 'consensus-seeking',
          profileContext: data.profileContext || undefined,
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
        rubric: data.rubric,
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
      style: debate.config.style,
      createdAt: debate.createdAt.toISOString(),
      completedAt: debate.completedAt?.toISOString(),
      rubric: debate.rubric,
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

  const submitHumanInput = async (content: string, stance?: string, confidence?: number) => {
    if (!session?.user || !debate?.id) return;

    setIsSubmittingHuman(true);
    setStreamingResponses([]);

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
          position: 'neutral',
          userId: (session.user as { id?: string }).id,
          userName: session.user.name || session.user.email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit human input');
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
            let data;
            try {
              data = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            if (data.type === 'response') {
              setStreamingResponses(prev => [...prev, data.data]);
            } else if (data.type === 'waiting-for-human') {
              // Still waiting for more human input
              setStreamingResponses([]);
              fetchDebate(); // Refresh to get latest state
            } else if (data.type === 'debate-complete') {
              // Debate finished - refresh to show full results
              setStreamingResponses([]);
              fetchDebate();
            }
          }
        }
      }
    } catch (err) {
      console.error('Error submitting human input:', err);
      alert('Failed to submit your response. Please try again.');
    } finally {
      setIsSubmittingHuman(false);
    }
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

  const allResponses = [
    ...(debate.rounds?.flatMap(r => r.responses) || []),
    ...streamingResponses
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/history">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>
          </Link>
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  variant={isPublic ? "default" : "secondary"}
                  size="sm"
                  onClick={togglePublic}
                  disabled={togglingPublic}
                >
                  {togglingPublic ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isPublic ? (
                    <Globe className="mr-2 h-4 w-4" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  {isPublic ? 'Public' : 'Make Public'}
                </Button>
                {isPublic && publicSlug && (
                  <Button variant="secondary" size="sm" onClick={copyPublicLink}>
                    {copiedLink ? (
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </Button>
                )}
              </>
            )}
            <Button variant="secondary" size="sm" onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
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
          {debate.config.profileContext && (
            <details className="mt-4 max-w-2xl mx-auto text-left">
              <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
                User Context Applied
              </summary>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 whitespace-pre-wrap">
                {debate.config.profileContext}
              </div>
            </details>
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
              debate.status === 'waiting-for-human' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {debate.status === 'waiting-for-human' ? 'Awaiting Your Input' : debate.status}
            </span>
          </div>
        </div>

        {/* Evaluation Rubric - Show for ideation mode */}
        {debate.config.style === 'ideation' && debate.rubric && (
          <div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl shadow-sm">
            <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
              Evaluation Rubric
              <span className="text-sm font-normal text-amber-700">(generated from success criteria)</span>
            </h3>
            <pre className="text-sm text-amber-900 whitespace-pre-wrap font-sans leading-relaxed">{debate.rubric}</pre>
          </div>
        )}

        {/* Resume Interactive Debate Banner */}
        {isWaitingForHuman && !isSubmittingHuman && (
          <div className="mb-6 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 border border-purple-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-purple-900">Interactive Debate Paused</h3>
                <p className="text-sm text-purple-700">This debate is waiting for your input to continue.</p>
              </div>
              <span className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm font-medium">
                Round {currentRound} of {totalRounds}
              </span>
            </div>
          </div>
        )}

        {/* Debate Responses */}
        <div className="space-y-4 mb-8">
          {allResponses.map((response, idx) => (
            <ModelResponseCard
              key={`${response.modelId}-${response.round}-${idx}`}
              response={response}
            />
          ))}
        </div>

        {/* Human Input Panel for Interactive Debates */}
        {isWaitingForHuman && (
          <div className="mb-8">
            <HumanInputPanel
              onSubmit={submitHumanInput}
              isSubmitting={isSubmittingHuman}
              currentRound={currentRound}
              totalRounds={totalRounds}
            />
          </div>
        )}

        {/* Streaming indicator */}
        {isSubmittingHuman && (
          <div className="mb-8 flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <Loader2 className="animate-spin text-blue-600" size={20} />
            <span className="text-blue-800 font-medium">AI models are responding to your input...</span>
          </div>
        )}

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