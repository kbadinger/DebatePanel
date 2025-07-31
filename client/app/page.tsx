'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DebateConfig, Model, ModelProvider } from '@/types/debate';
import { DebateInterface } from '@/components/debate/DebateInterface';
import { ExampleDebateResult } from '@/components/debate/ExampleDebateResult';
import { AVAILABLE_MODELS } from '@/lib/models/config';
import { calculateDebateCost, formatCost } from '@/lib/models/pricing';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const [showDebate, setShowDebate] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [showAllProviders, setShowAllProviders] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<ModelProvider[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch configured providers on mount
  useEffect(() => {
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => {
        setConfiguredProviders(data.configuredProviders);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch providers:', err);
        setLoading(false);
      });
  }, []);
  
  // Filter models based on configured providers
  const availableModels = AVAILABLE_MODELS.filter(model => 
    configuredProviders.includes(model.provider)
  );
  
  // Define recommended models (filtered by available)
  const recommendedModelIds = [
    'gpt-4.1',
    'claude-sonnet-4',
    'gemini-2.5-pro',
    'kimi-k2-instruct',
    'gpt-4.1-mini',
    'grok-3',
    'mistral-medium-3',
    'qwen-3-235b'
  ];
  
  const recommendedModels = recommendedModelIds
    .map(id => availableModels.find(m => m.id === id))
    .filter(Boolean) as Model[];
    
  const [config, setConfig] = useState<DebateConfig>({
    topic: '',
    description: '',
    models: [
      availableModels.find(m => m.id === 'gpt-4.1'),
      availableModels.find(m => m.id === 'claude-sonnet-4'),
      availableModels.find(m => m.id === 'gemini-2.5-pro')
    ].filter(Boolean) as Model[], // Default to top model from each major provider
    rounds: 3,
    format: 'structured',
    convergenceThreshold: 0.75,
    judge: {
      enabled: true,
      model: availableModels.find(m => m.id === 'claude-sonnet-4') || availableModels[0]
    }
  });

  // Group models by provider (only configured ones)
  const modelsByProvider = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  const providerDisplayNames: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    xai: 'X.AI (Grok)',
    perplexity: 'Perplexity',
    deepseek: 'DeepSeek',
    mistral: 'Mistral',
    meta: 'Meta (Llama)',
    cohere: 'Cohere',
    ai21: 'AI21 Labs',
    kimi: 'Moonshot AI (Kimi)',
    qwen: 'Alibaba (Qwen)',
    flux: 'Flux AI'
  };

  const loadMonetizationDebate = () => {
    setConfig({
      ...config,
      topic: 'Should we charge users a fee and provide API keys (keyless), or charge a lower platform fee and let users bring their own keys (BYOK)?',
      description: `Current Situation:
- AI debate platform orchestrating discussions between multiple models
- Target audiences: developers, researchers, businesses, general users

Option 1 - Keyless ($9.99-24.99/month):
- We provide all API keys
- Zero friction onboarding
- Higher operational costs
- Larger addressable market

Option 2 - BYOK ($4.99/month platform fee):
- Users bring their own API keys
- Full transparency on costs
- Power user focused
- Minimal operational costs

Option 3 - Hybrid Model:
- Offer both options
- Free tier with limits
- Natural upgrade path`,
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.topic.trim() && config.description?.trim()) {
      setShowDebate(true);
    }
  };
  
  if (showDebate) {
    return (
      <div>
        <div className="mb-4 px-4">
          <Button 
            onClick={() => setShowDebate(false)} 
            variant="secondary"
            className="text-sm"
          >
            ← Back to Configuration
          </Button>
        </div>
        <DebateInterface config={config} />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className={`${status === 'unauthenticated' ? 'max-w-5xl' : 'max-w-2xl'} mx-auto pt-12 px-4`}>
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-center mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">DebatePanel</h1>
          <p className="text-center text-slate-700 text-lg mb-2">
            AI Consensus Engine
          </p>
        </div>
        <p className="text-center text-slate-600 text-base mb-8 max-w-2xl mx-auto">
          Orchestrate structured debates between GPT-4, Claude, Gemini, and other leading AI models to explore multiple perspectives and reach consensus
        </p>
        
        {loading && (
          <div className="text-center mb-6">
            <p className="text-slate-600">Loading available models...</p>
          </div>
        )}
        
        {!loading && configuredProviders.length === 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-amber-900 mb-2">No API Keys Configured</h3>
            <p className="text-amber-800 mb-3">
              Please add API keys to your .env file to enable models. Example:
            </p>
            <pre className="bg-amber-100 p-3 rounded text-sm text-amber-900 overflow-x-auto">
              OPENAI_API_KEY=your_key_here
              ANTHROPIC_API_KEY=your_key_here
            </pre>
            <p className="text-amber-800 mt-3 text-sm">
              See .env.example for all available providers.
            </p>
          </div>
        )}
        
        {!loading && configuredProviders.length > 0 && (
          <div className="text-center mb-6 text-sm text-slate-600">
            {configuredProviders.length} provider{configuredProviders.length !== 1 ? 's' : ''} configured • 
            {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available
          </div>
        )}
        
        {status === 'unauthenticated' && (
          <>
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl p-8 border border-slate-100 text-center mb-8">
              <div className="flex justify-center mb-4">
                <Sparkles className="text-purple-600" size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">See AI Models Debate & Reach Consensus</h2>
              <p className="text-slate-600 mb-6">
                Watch GPT-4, Claude, Gemini and other leading AI models debate topics from multiple perspectives, 
                then see our AI Judge synthesize their insights into actionable conclusions.
              </p>
              <div className="space-y-3">
                <Link href="/signup" className="block">
                  <Button className="w-full" size="lg">
                    Start Free Trial → Get $5 Credits
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full" size="lg">
                    Sign in
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-slate-500 mt-6">
                No credit card required • 35+ AI models available
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-center text-lg font-semibold text-slate-800 mb-2">Example Debate Result</h3>
              <p className="text-center text-sm text-slate-600 mb-6">
                Here's what you'll get from every debate - a judge's verdict synthesizing all perspectives
              </p>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                <ExampleDebateResult />
              </div>
            </div>

            <div className="max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 text-center border border-blue-200">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Ready to explore any topic with AI consensus?</h3>
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Create Free Account
                </Button>
              </Link>
              <p className="text-sm text-slate-600 mt-4">
                Join researchers, students, and professionals using AI debates for better decisions
              </p>
            </div>
          </>
        )}
        
        {session && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-8 border border-slate-100">
          <div className="mb-6 text-center">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={loadMonetizationDebate}
              className="text-sm"
            >
              Load Example: Monetization Strategy Debate
            </Button>
          </div>
          
          <div className="mb-4">
            <label htmlFor="topic" className="block text-sm font-semibold text-slate-700 mb-2">
              Debate Topic <span className="text-red-500">*</span>
            </label>
            <input
              id="topic"
              type="text"
              value={config.topic}
              onChange={(e) => setConfig({ ...config, topic: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white font-medium"
              placeholder="e.g., Should we build a mobile app or web app first?"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Frame as a question or decision that needs multiple perspectives</p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
              Context & Details <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white font-medium"
              rows={8}
              placeholder="Provide detailed context, constraints, and key considerations for the debate..."
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Models ({config.models.length} selected)
            </label>
            
            {availableModels.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                No models available. Please configure API keys.
              </div>
            ) : (
              <>
            {/* Recommended Models */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Popular Choices</div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">🟢 Budget</span>
                  <span className="flex items-center gap-1">🔵 Standard</span>
                  <span className="flex items-center gap-1">🟣 Premium</span>
                  <span className="flex items-center gap-1">⚫ Luxury</span>
                </div>
              </div>
              <div className="space-y-1 bg-blue-50 rounded-lg p-2">
                {recommendedModels.map((model) => (
                  <label key={model.id} className="flex items-center justify-between p-2 rounded hover:bg-blue-100 cursor-pointer transition-colors">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.models.some(m => m.id === model.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig({ ...config, models: [...config.models, model] });
                          } else {
                            setConfig({ ...config, models: config.models.filter(m => m.id !== model.id) });
                          }
                        }}
                        className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700 font-medium">
                        {model.costInfo?.emoji} {model.displayName}
                      </span>
                    </div>
                    <span className="text-sm text-slate-600">
                      {model.costInfo ? formatCost(model.costInfo.estimatedCostPerResponse) : 'Price TBD'}/response
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Show All Providers Toggle */}
            <button
              type="button"
              onClick={() => setShowAllProviders(!showAllProviders)}
              className="mb-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              {showAllProviders ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {showAllProviders ? 'Hide' : 'Show'} all models by provider
            </button>

            {/* All Models by Provider */}
            {showAllProviders && (
              <div className="space-y-2">
                {Object.entries(modelsByProvider).map(([provider, models]) => (
                  <div key={provider} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedProviders(prev => ({ ...prev, [provider]: !prev[provider] }))}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedProviders[provider] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        <span className="font-medium text-slate-700">{providerDisplayNames[provider] || provider}</span>
                        <span className="text-sm text-slate-500">
                          ({models.filter(m => config.models.some(cm => cm.id === m.id)).length}/{models.length})
                        </span>
                      </div>
                    </button>
                    
                    {expandedProviders[provider] && (
                      <div className="border-t border-slate-200">
                        {models.map((model) => (
                          <label key={model.id} className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={config.models.some(m => m.id === model.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setConfig({ ...config, models: [...config.models, model] });
                                  } else {
                                    setConfig({ ...config, models: config.models.filter(m => m.id !== model.id) });
                                  }
                                }}
                                className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-slate-700 font-medium">
                                {model.costInfo?.emoji} {model.displayName}
                              </span>
                            </div>
                            <span className="text-sm text-slate-500">
                              {model.costInfo ? formatCost(model.costInfo.estimatedCostPerResponse) : 'Price TBD'}/response
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
              </>
            )}
            
            {config.models.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-semibold text-blue-900 mb-2">Estimated Debate Cost</div>
                {(() => {
                  const cost = calculateDebateCost(
                    config.models, 
                    config.rounds || 3, 
                    config.topic, 
                    config.description || '',
                    config.judge?.enabled ? config.judge.model : null
                  );
                  return (
                    <>
                      <div className="space-y-1 text-sm">
                        {cost.breakdown.map((item, index) => (
                          <div key={`${item.modelId}-${index}`} className="flex justify-between text-slate-700">
                            <span>{item.displayName} × {config.rounds || 3} rounds:</span>
                            <span>{formatCost(item.userCost)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-1 mt-2">
                          <div className="flex justify-between text-slate-600">
                            <span>API Cost:</span>
                            <span>{formatCost(cost.apiCost)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Platform Fee (30%):</span>
                            <span>{formatCost(cost.platformFee)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between font-bold text-blue-900 mt-2 pt-2 border-t border-blue-200">
                        <span>Total Cost:</span>
                        <span>{formatCost(cost.totalCost)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="rounds" className="block text-sm font-semibold text-slate-700 mb-2">
              Number of Rounds
            </label>
            <input
              id="rounds"
              type="number"
              min="1"
              max="10"
              value={config.rounds}
              onChange={(e) => setConfig({ ...config, rounds: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white font-medium"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Judge Model
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.judge?.enabled || false}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    judge: { 
                      ...config.judge,
                      enabled: e.target.checked,
                      model: config.judge?.model || AVAILABLE_MODELS.find(m => m.id === 'claude-3-5-sonnet')
                    } 
                  })}
                  className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium">Enable Judge Analysis</span>
              </label>
              
              {config.judge?.enabled && (
                <div className="ml-7">
                  <select
                    value={config.judge.model?.id || 'claude-3-5-sonnet'}
                    onChange={(e) => {
                      const model = AVAILABLE_MODELS.find(m => m.id === e.target.value);
                      setConfig({ 
                        ...config, 
                        judge: { 
                          ...config.judge,
                          enabled: true,
                          model 
                        } 
                      });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white font-medium"
                  >
                    {availableModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.displayName}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    The judge provides a nuanced final verdict beyond statistical analysis
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {(() => {
            const cost = calculateDebateCost(
              config.models, 
              config.rounds || 3, 
              config.topic, 
              config.description || '',
              config.judge?.enabled ? config.judge.model : null
            );
            const isExpensive = cost.totalCost > 0.50;
            return (
              <>
                {isExpensive && (
                  <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-600">⚠️</span>
                      <div className="text-sm text-amber-800">
                        <div className="font-semibold mb-1">High Cost Debate</div>
                        <div>This debate will cost {formatCost(cost.totalCost)}, which is above typical usage.</div>
                        <div className="mt-1">Consider using more cost-effective models or fewer rounds.</div>
                      </div>
                    </div>
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full text-white font-semibold" 
                  size="lg"
                  disabled={availableModels.length === 0 || config.models.length === 0}
                >
                  {availableModels.length === 0 ? 'No Models Available' : `Start Debate (~${formatCost(cost.totalCost)})`}
                </Button>
              </>
            );
          })()}
        </form>
        )}
      </div>
    </div>
  );
}