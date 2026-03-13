'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Sparkles } from 'lucide-react';

interface HumanInputPanelProps {
  onSubmit: (content: string, stance?: string, confidence?: number) => void;
  isSubmitting: boolean;
  currentRound: number;
  totalRounds: number;
}

export function HumanInputPanel({ onSubmit, isSubmitting, currentRound, totalRounds }: HumanInputPanelProps) {
  const [content, setContent] = useState('');
  const [stance, setStance] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [position, setPosition] = useState<'agree' | 'neutral' | 'disagree'>('neutral');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !isSubmitting) {
      onSubmit(content.trim(), stance || undefined, confidence);
      setContent('');
      setStance('');
    }
  };

  const positionColors = {
    agree: 'from-green-500 to-emerald-500',
    neutral: 'from-gray-500 to-slate-500',
    disagree: 'from-red-500 to-orange-500'
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border-2 border-purple-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Your Turn to Speak
        </h3>
        <span className="text-sm text-slate-600">
          Round {currentRound} of {totalRounds}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your perspective on this topic..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-900 bg-white font-medium resize-none"
            rows={6}
            disabled={isSubmitting}
            autoFocus
          />
          <p className="mt-1 text-xs text-slate-500">
            Make your argument clear and compelling. The AI models will respond to your points.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="stance" className="block text-sm font-medium text-slate-700 mb-1">
              Your Stance (Optional)
            </label>
            <input
              id="stance"
              type="text"
              value={stance}
              onChange={(e) => setStance(e.target.value)}
              placeholder="e.g., 'Hybrid approach', 'Option A'"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-900 bg-white text-sm"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="confidence" className="block text-sm font-medium text-slate-700 mb-1">
              Confidence: {confidence}%
            </label>
            <input
              id="confidence"
              type="range"
              min="0"
              max="100"
              step="5"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full mt-2"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Position
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['agree', 'neutral', 'disagree'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setPosition(pos)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  position === pos
                    ? `bg-gradient-to-r ${positionColors[pos]} text-white shadow-lg`
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                disabled={isSubmitting}
              >
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg"
          size="lg"
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <>Submitting...</>
          ) : (
            <>
              <Send className="mr-2" size={20} />
              Submit Your Argument
            </>
          )}
        </Button>
      </form>
    </div>
  );
}