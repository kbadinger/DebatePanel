'use client';

import { HelpCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';

export function RatingsKey() {
  const consensusPositions = [
    { 
      position: 'strong-consensus', 
      label: 'Strong Consensus', 
      description: 'Aligns with majority',
      icon: TrendingUp,
      color: 'bg-green-500',
      borderColor: 'border-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    { 
      position: 'partial-consensus', 
      label: 'Partial Consensus',
      description: 'Some alignment',
      icon: TrendingUp,
      color: 'bg-green-400',
      borderColor: 'border-green-400',
      bgColor: 'bg-green-50/70',
      textColor: 'text-green-600'
    },
    { 
      position: 'independent', 
      label: 'Independent',
      description: 'Unique position',
      icon: Minus,
      color: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    { 
      position: 'divergent', 
      label: 'Divergent',
      description: 'Moving away',
      icon: TrendingDown,
      color: 'bg-orange-500',
      borderColor: 'border-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    { 
      position: 'strong-dissent', 
      label: 'Strong Dissent',
      description: 'Opposing majority',
      icon: TrendingDown,
      color: 'bg-red-500',
      borderColor: 'border-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle size={16} className="text-slate-600" />
        <span className="text-sm font-semibold text-slate-800">Consensus Tracking Scale</span>
        <span className="text-xs text-slate-500 ml-auto">Round 2+ shows alignment between models</span>
      </div>
      
      <div className="grid grid-cols-5 gap-3">
        {consensusPositions.map((pos) => {
          const Icon = pos.icon;
          return (
            <div key={pos.position} className={clsx(
              'flex flex-col items-center p-3 rounded-lg border-2 transition-all hover:shadow-md',
              pos.borderColor,
              pos.bgColor
            )}>
              <div className="flex items-center gap-2 mb-1">
                <div className={clsx(
                  'w-4 h-4 rounded-full',
                  pos.color
                )} />
                <Icon size={16} className={pos.textColor} />
              </div>
              <span className={clsx('text-xs font-semibold', pos.textColor)}>
                {pos.label}
              </span>
              <span className="text-xs text-slate-600 mt-1 text-center">
                {pos.description}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
        <div className="flex items-center justify-between mb-2">
          <span><strong>Round 1:</strong> Models state initial positions (no colors)</span>
          <span><strong>Round 2+:</strong> Colors show consensus alignment</span>
        </div>
        <div className="text-slate-500">
          Models can maintain independent positions or converge toward consensus as the debate progresses.
        </div>
      </div>
    </div>
  );
}