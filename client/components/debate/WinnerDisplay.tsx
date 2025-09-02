'use client';

import { Trophy, Medal, Award, Star } from 'lucide-react';
import { Debate } from '@/types/debate';

interface WinnerDisplayProps {
  debate: Debate;
}

export function WinnerDisplay({ debate }: WinnerDisplayProps) {
  if (!debate.winner && !debate.scores) {
    return null;
  }

  const isConsensusMode = debate.config?.style === 'consensus-seeking';
  const winnerTitle = isConsensusMode ? 'Leading Contributor' : 'Debate Winner';
  const scoreTitle = isConsensusMode ? 'Contribution Scores' : 'Performance Scores';

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { icon: Trophy, color: 'text-yellow-500', label: 'Outstanding' };
    if (score >= 75) return { icon: Medal, color: 'text-gray-400', label: 'Excellent' };
    if (score >= 60) return { icon: Award, color: 'text-orange-600', label: 'Good' };
    return { icon: Star, color: 'text-blue-500', label: 'Participant' };
  };

  // Sort scores by value if available
  const sortedScores = debate.scores ? [...debate.scores].sort((a, b) => b.score - a.score) : [];

  return (
    <div className="mt-6 space-y-4">
      {/* Winner Announcement */}
      {debate.winner && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-8 h-8 text-yellow-600" />
            <h3 className="text-2xl font-bold text-gray-900">{winnerTitle}</h3>
          </div>
          
          <div className="space-y-2">
            <p className="text-xl font-semibold text-gray-800">
              {debate.winner.name}
              {debate.winner.type === 'human' && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">Human Participant</span>
              )}
            </p>
            <p className="text-gray-600 italic">&quot;{debate.winner.reason}&quot;</p>
          </div>
        </div>
      )}

      {/* Scores Leaderboard */}
      {sortedScores.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{scoreTitle}</h3>
          
          <div className="space-y-3">
            {sortedScores.map((score, index) => {
              const badge = getScoreBadge(score.score);
              const BadgeIcon = badge.icon;
              const isWinner = debate.winner && score.id === debate.winner.id;
              
              return (
                <div 
                  key={score.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isWinner ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
                      {index === 0 ? (
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      ) : index === 1 ? (
                        <Medal className="w-5 h-5 text-gray-400" />
                      ) : index === 2 ? (
                        <Award className="w-5 h-5 text-orange-600" />
                      ) : (
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      )}
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-900">
                        {score.name}
                        {isWinner && (
                          <Trophy className="inline-block w-4 h-4 ml-2 text-yellow-500" />
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <BadgeIcon className={`w-5 h-5 ${badge.color}`} />
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                        {score.score}
                      </p>
                      <p className="text-xs text-gray-500">{badge.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Victory Conditions Legend */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <h4 className="font-semibold text-gray-700 mb-2">How Winners Are Determined</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>Logical consistency and quality of reasoning</li>
          <li>Strength of evidence and examples provided</li>
          <li>Persuasiveness and clarity of arguments</li>
          <li>Ability to address counterarguments effectively</li>
          <li>Overall contribution to reaching the best solution</li>
        </ul>
      </div>
    </div>
  );
}