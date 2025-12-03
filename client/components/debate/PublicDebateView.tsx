'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Share2,
  Users,
  Trophy,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface DebateResponse {
  modelId: string;
  modelProvider: string;
  content: string;
  position: string;
  confidence: number;
  isHuman: boolean;
  argumentScore: number | null;
}

interface DebateRound {
  roundNumber: number;
  consensus: string | null;
  keyDisagreements: string[];
  responses: DebateResponse[];
}

interface PublicDebate {
  id: string;
  topic: string;
  description: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  finalSynthesis: string | null;
  judgeAnalysis: string | null;
  winner: {
    id: string;
    name: string | null;
    type: string | null;
    reason: string | null;
  } | null;
  models: { id: string; provider: string; name: string }[];
  rounds: DebateRound[];
  scores: {
    participantId: string;
    participantName: string;
    participantType: string;
    totalScore: number;
  }[];
}

function getModelDisplayName(modelId: string, models: PublicDebate['models']): string {
  const model = models.find(m => m.id === modelId);
  if (model) return model.name;
  // Fallback formatting
  return modelId.split('/').pop()?.replace(/-/g, ' ') || modelId;
}

function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    openai: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    anthropic: 'bg-orange-100 text-orange-800 border-orange-200',
    google: 'bg-blue-100 text-blue-800 border-blue-200',
    xai: 'bg-gray-100 text-gray-800 border-gray-200',
    mistral: 'bg-purple-100 text-purple-800 border-purple-200',
    meta: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };
  return colors[provider.toLowerCase()] || 'bg-slate-100 text-slate-800 border-slate-200';
}

export function PublicDebateView({ debate }: { debate: PublicDebate }) {
  const [expandedRounds, setExpandedRounds] = useState<number[]>([1]);
  const [expandedResponses, setExpandedResponses] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const toggleResponse = (responseKey: string) => {
    setExpandedResponses(prev =>
      prev.includes(responseKey)
        ? prev.filter(r => r !== responseKey)
        : [...prev, responseKey]
    );
  };

  // Truncate to ~3-4 sentences
  const truncateContent = (content: string) => {
    // Find the end of the 3rd or 4th sentence within first 500 chars
    const maxScan = Math.min(content.length, 500);
    const snippet = content.substring(0, maxScan);

    // Count sentence endings
    let sentenceCount = 0;
    let lastSentenceEnd = 0;

    for (let i = 0; i < snippet.length; i++) {
      if (snippet[i] === '.' || snippet[i] === '!' || snippet[i] === '?') {
        // Check it's not a decimal or abbreviation
        if (i + 1 < snippet.length && (snippet[i + 1] === ' ' || snippet[i + 1] === '\n')) {
          sentenceCount++;
          lastSentenceEnd = i + 1;
          if (sentenceCount >= 3) break;
        }
      }
    }

    if (sentenceCount >= 2 && lastSentenceEnd > 100) {
      return content.substring(0, lastSentenceEnd).trim();
    }

    // Fallback to character limit
    if (content.length <= 250) return content;
    return content.substring(0, 250).trim() + '...';
  };

  // Check if a response is from the Challenger
  const isChallenger = (modelId: string) => {
    return modelId.startsWith('challenger-') ||
           modelId.toLowerCase().includes('challenger');
  };

  const toggleRound = (roundNumber: number) => {
    setExpandedRounds(prev =>
      prev.includes(roundNumber)
        ? prev.filter(r => r !== roundNumber)
        : [...prev, roundNumber]
    );
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.share({
        title: debate.topic,
        text: `AI Debate: ${debate.topic}`,
        url
      });
    } catch {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900">
            DecisionForge
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Share'}
            </Button>
            <Link href="/signup">
              <Button size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Request Access
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Debate Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{debate.topic}</h1>
          {debate.description && (
            <p className="text-slate-600 text-lg mb-6">{debate.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{debate.models.length} AI models</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              <span>{debate.rounds.length} rounds</span>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              debate.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {debate.status === 'completed' ? 'Completed' : debate.status}
            </div>
            <span className="text-slate-400">
              {new Date(debate.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>

          {/* Participating Models */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700 mb-3">Participating Models:</p>
            <div className="flex flex-wrap gap-2">
              {debate.models.map(model => (
                <span
                  key={model.id}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getProviderColor(model.provider)}`}
                >
                  {model.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Winner Banner */}
        {debate.winner && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 mb-8 border-2 border-amber-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">Winner</p>
                <p className="text-xl font-bold text-amber-900">{debate.winner.name}</p>
                {debate.winner.reason && (
                  <p className="text-sm text-amber-700 mt-1">{debate.winner.reason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Judge's Verdict */}
        {debate.judgeAnalysis && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 mb-8 border-2 border-purple-200">
            <h2 className="text-2xl font-bold text-purple-900 mb-4 flex items-center gap-2">
              ⚖️ Judge&apos;s Verdict
            </h2>
            <div
              className="prose prose-slate max-w-none text-slate-800"
              dangerouslySetInnerHTML={{
                __html: debate.judgeAnalysis
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
                  .replace(/^- (.*?)$/gm, '<div class="ml-4 mb-2">• $1</div>')
                  .replace(/\n/g, '<br/>')
              }}
            />
          </div>
        )}

        {/* Final Synthesis */}
        {debate.finalSynthesis && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 mb-8 border-2 border-blue-200">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">📊 Synthesis</h2>
            <div
              className="prose prose-slate max-w-none text-slate-800"
              dangerouslySetInnerHTML={{
                __html: debate.finalSynthesis
                  .replace(/^## (.*?)$/gm, '<h3 class="text-xl font-bold mb-3 text-slate-900 mt-6">$1</h3>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
                  .replace(/^• (.*?)$/gm, '<div class="ml-4 mb-1">• $1</div>')
                  .replace(/\n/g, '<br/>')
              }}
            />
          </div>
        )}

        {/* Debate Rounds */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-slate-900">Debate Rounds</h2>
          {debate.rounds.map(round => (
            <div key={round.roundNumber} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleRound(round.roundNumber)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold text-slate-900">Round {round.roundNumber}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{round.responses.length} responses</span>
                  {expandedRounds.includes(round.roundNumber) ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {expandedRounds.includes(round.roundNumber) && (() => {
                // Separate regular responses from Challenger
                const regularResponses = round.responses.filter(r => !isChallenger(r.modelId));
                const challengerResponse = round.responses.find(r => isChallenger(r.modelId));

                return (
                  <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
                    {/* 1. Model Responses (not Challenger) */}
                    {regularResponses.map((response, idx) => {
                      const responseKey = `${round.roundNumber}-${idx}`;
                      const isExpanded = expandedResponses.includes(responseKey);
                      const needsTruncation = response.content.length > 250;

                      return (
                        <div key={idx} className="rounded-lg p-5 bg-slate-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getProviderColor(response.modelProvider)}`}>
                                {getModelDisplayName(response.modelId, debate.models)}
                              </span>
                              {response.isHuman && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">Human</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-slate-500">Confidence: {response.confidence}%</span>
                              {response.argumentScore && (
                                <span className="text-slate-500">Score: {response.argumentScore.toFixed(1)}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                            {isExpanded ? response.content : truncateContent(response.content)}
                          </div>
                          {needsTruncation && (
                            <button
                              onClick={() => toggleResponse(responseKey)}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {isExpanded ? '← Show less' : 'Read more →'}
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* 2. Round Synthesis */}
                    {round.consensus && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-800 mb-1">📊 Round {round.roundNumber} Synthesis</p>
                        <p className="text-sm text-blue-900">{round.consensus}</p>
                      </div>
                    )}

                    {/* 3. Challenger (after synthesis, but NOT on final round - nothing to stress-test) */}
                    {challengerResponse && round.roundNumber < debate.rounds.length && (() => {
                      const challengerKey = `${round.roundNumber}-challenger`;
                      const isExpanded = expandedResponses.includes(challengerKey);
                      const needsTruncation = challengerResponse.content.length > 250;

                      return (
                        <div className="rounded-lg p-5 bg-indigo-50 border-2 border-indigo-300">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-xs font-bold">⚔️ CHALLENGER</span>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getProviderColor(challengerResponse.modelProvider)}`}>
                                {getModelDisplayName(challengerResponse.modelId, debate.models)}
                              </span>
                            </div>
                          </div>
                          <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                            {isExpanded ? challengerResponse.content : truncateContent(challengerResponse.content)}
                          </div>
                          {needsTruncation && (
                            <button
                              onClick={() => toggleResponse(challengerKey)}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {isExpanded ? '← Show less' : 'Read more →'}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Want to run your own AI debates?</h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            DecisionForge lets you pit multiple AI models against each other on any topic.
            See where they agree, where they disagree, and get synthesized insights.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
              Request Access
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Read more link */}
        <div className="mt-8 text-center">
          <a
            href="https://kevinbadinger.com/work/decisionforge"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            Learn how DecisionForge works →
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <a
                href="https://resolventtech.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-700 transition-colors"
              >
                Terms
              </a>
              <a
                href="https://resolventtech.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-700 transition-colors"
              >
                Privacy
              </a>
              <a
                href="https://resolventtech.com/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-700 transition-colors"
              >
                Contact
              </a>
            </div>

            {/* Copyright */}
            <div className="text-sm text-slate-400">
              © {new Date().getFullYear()} Operated by{' '}
              <a
                href="https://resolventtech.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                Resolvent Technologies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
