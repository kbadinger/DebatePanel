'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DebateConfig, Model, ModelProvider } from '@/types/debate';
import { DebateInterface } from '@/components/debate/DebateInterface';
import { ExampleDebateResult } from '@/components/debate/ExampleDebateResult';
import { AVAILABLE_MODELS, MODEL_TIERS, PROVIDER_MODELS } from '@/lib/models/config';
import { calculateDebateCost, formatCost } from '@/lib/models/pricing';
import { calculateContextRequirements, analyzePanelDiversity, getSmartRecommendations } from '@/lib/context-analysis';
import { analyzeTopicSafety, getTopicSuggestions } from '@/lib/topic-filter';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Sparkles, AlertTriangle, CheckCircle, Info, Lightbulb, Shield, ShieldAlert } from 'lucide-react';
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
  
  // Filter models based on configured providers and tier them
  const availableModels = AVAILABLE_MODELS.filter(model => 
    configuredProviders.includes(model.provider)
  );
  
  // Separate into featured and expandable models based on availability
  const availableFeaturedModels = PROVIDER_MODELS.featured.filter(model => 
    configuredProviders.includes(model.provider)
  );
  

    
  const [config, setConfig] = useState<DebateConfig>({
    topic: '',
    description: '',
    models: [
      availableModels.find(m => m.id === 'gpt-4o'),
      availableModels.find(m => m.id === 'claude-3-5-sonnet-20241022'),
      availableModels.find(m => m.id === 'gemini-2.5-pro')
    ].filter(Boolean) as Model[], // Default to top primary tier models
    rounds: 3, // Ensure this is always a valid number
    format: 'structured',
    style: 'consensus-seeking', // Default to consensus-seeking
    convergenceThreshold: 0.75,
    judge: {
      enabled: true,
      model: availableModels.find(m => m.id === 'claude-3-5-sonnet-20241022') || availableModels[0]
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
    
    // Check topic safety before proceeding
    const topicAnalysis = analyzeTopicSafety(config.topic, config.description, config.style);
    if (topicAnalysis.severity === 'blocked') {
      alert('This topic cannot be debated due to safety concerns. Please see the suggestions above for academic alternatives.');
      return;
    }
    
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
        <div className="mb-8 text-center">
          <img 
            src="/logos/svg/Color logo - no background.svg" 
            alt="DecisionForge" 
            className="h-20 w-auto mx-auto mb-4"
          />
          <p className="text-center text-slate-700 text-lg mb-2">
            AI Decision Platform
          </p>
        </div>
        <p className="text-center text-slate-600 text-base mb-8 max-w-2xl mx-auto">
          Harness an AI council of GPT, Claude, Gemini, Grok, and other leading models to analyze complex decisions and forge optimal solutions for your business
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
                Watch GPT, Claude, Gemini, Grok and other leading AI models debate topics from multiple perspectives, 
                then see our AI Judge synthesize their insights into actionable conclusions.
              </p>
              <div className="space-y-3">
                <Link href="/signup" className="block">
                  <Button className="w-full" size="lg">
                    Start Free Trial → Get $5 Credits
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button variant="secondary" className="w-full" size="lg">
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
                Here&apos;s what you&apos;ll get from every debate - a judge&apos;s verdict synthesizing all perspectives
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
            
            {/* Topic Safety Analysis */}
            {config.topic && (
              (() => {
                const topicAnalysis = analyzeTopicSafety(config.topic, config.description, config.style);
                
                if (topicAnalysis.severity === 'safe') return null;
                
                return (
                  <div className={`mt-3 p-3 rounded-lg border ${
                    topicAnalysis.severity === 'blocked' 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-amber-300 bg-amber-50'
                  }`}>
                    <div className="flex items-start gap-2 mb-2">
                      {topicAnalysis.severity === 'blocked' ? (
                        <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
                      ) : (
                        <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${
                          topicAnalysis.severity === 'blocked' ? 'text-red-800' : 'text-amber-800'
                        }`}>
                          {topicAnalysis.severity === 'blocked' ? 'Topic Not Allowed' : 'Topic Warning'}
                        </h4>
                        
                        {topicAnalysis.issues.map((issue, idx) => (
                          <p key={idx} className={`text-sm mt-1 ${
                            topicAnalysis.severity === 'blocked' ? 'text-red-700' : 'text-amber-700'
                          }`}>
                            {issue.message}
                          </p>
                        ))}
                        
                        {topicAnalysis.modelCompatibility.mayRefuse.length > 0 && (
                          <p className={`text-xs mt-2 ${
                            topicAnalysis.severity === 'blocked' ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            <strong>Models that may refuse:</strong> {topicAnalysis.modelCompatibility.mayRefuse.join(', ')}
                          </p>
                        )}
                        
                        {topicAnalysis.suggestions.length > 0 && (
                          <div className="mt-2">
                            <p className={`text-xs font-medium ${
                              topicAnalysis.severity === 'blocked' ? 'text-red-700' : 'text-amber-700'
                            }`}>
                              {topicAnalysis.severity === 'blocked' ? 'Try instead:' : 'Suggestions:'}
                            </p>
                            <ul className="mt-1 space-y-1">
                              {topicAnalysis.suggestions.map((suggestion, idx) => (
                                <li key={idx} className={`text-xs ${
                                  topicAnalysis.severity === 'blocked' ? 'text-red-600' : 'text-amber-600'
                                }`}>
                                  • {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Show topic suggestions for blocked topics */}
                        {topicAnalysis.severity === 'blocked' && (() => {
                          const suggestions = getTopicSuggestions(config.topic);
                          if (suggestions.length === 0) return null;
                          
                          return (
                            <div className="mt-3 pt-2 border-t border-red-200">
                              <p className="text-xs font-medium text-red-700 mb-2">Academic alternatives:</p>
                              <div className="space-y-1">
                                {suggestions.slice(0, 3).map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setConfig({ ...config, topic: suggestion })}
                                    className="block w-full text-left text-xs text-red-600 hover:text-red-800 hover:bg-red-100 p-1 rounded transition-colors"
                                  >
                                    → {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
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
              Select Models ({config.models.length}/6 selected, max 2 per provider)
              {config.models.length >= 5 && (
                <span className={`ml-2 text-xs font-medium ${
                  config.models.length >= 6 ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {config.models.length >= 6 ? '⚠️ Maximum reached' : '⚠️ Approaching limit'}
                </span>
              )}
            </label>
            
            {availableModels.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                No models available. Please configure API keys.
              </div>
            ) : (
              <>
            {/* Featured Models - Clean Primary View */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Featured Models (September 2025)</div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">💰 Budget</span>
                  <span className="flex items-center gap-1">📊 Standard</span>
                  <span className="flex items-center gap-1">⭐ Premium</span>
                  <span className="flex items-center gap-1">🚀 Flagship</span>
                </div>
              </div>
              <div className="space-y-1 bg-blue-50 rounded-lg p-2">
                {availableFeaturedModels.map((model) => (
                  <label key={model.id} className="block p-2 rounded hover:bg-blue-100 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.models.some(m => m.id === model.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (config.models.length >= 6) {
                                alert('Maximum 6 models allowed. Focus on diverse models across different providers for best performance.');
                                return;
                              }
                              
                              // Check provider limit (max 2 per provider)
                              const providerCount = config.models.filter(m => m.provider === model.provider).length;
                              if (providerCount >= 2) {
                                alert(`Maximum 2 models per provider (${model.provider}). Try selecting from different providers for diverse perspectives.`);
                                return;
                              }
                              
                              setConfig({ ...config, models: [...config.models, model] });
                            } else {
                              setConfig({ ...config, models: config.models.filter(m => m.id !== model.id) });
                            }
                          }}
                          className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-slate-700 font-medium">
                            {model.costInfo?.emoji} {model.displayName}
                          </span>
                          <div className="text-xs text-slate-500 mt-1">
                            {model.contextInfo?.suggestedRole}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {model.contextInfo?.strengths.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')} • 
                            {model.contextInfo?.maxTokens ? ` ${(model.contextInfo.maxTokens / 1000).toFixed(0)}K context` : ' Context TBD'}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-slate-600">
                        {model.costInfo ? formatCost(model.costInfo.estimatedCostPerResponse) : 'Price TBD'}/response
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Legacy Show All Models Toggle - Keep for complete exploration */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAllProviders(!showAllProviders)}
                className="mb-3 text-sm text-slate-600 hover:text-slate-700 font-medium flex items-center gap-1"
              >
                {showAllProviders ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {showAllProviders ? 'Hide' : 'Show'} all models (organized by provider)
              </button>
            </div>

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
                          <label key={model.id} className="block p-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={config.models.some(m => m.id === model.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      if (config.models.length >= 6) {
                                        alert('Maximum 6 models allowed. Focus on diverse models across different providers for best performance.');
                                        return;
                                      }
                                      
                                      // Check provider limit (max 2 per provider)
                                      const providerCount = config.models.filter(m => m.provider === model.provider).length;
                                      if (providerCount >= 2) {
                                        alert(`Maximum 2 models per provider (${model.provider}). Try selecting from different providers for diverse perspectives.`);
                                        return;
                                      }
                                      
                                      setConfig({ ...config, models: [...config.models, model] });
                                    } else {
                                      setConfig({ ...config, models: config.models.filter(m => m.id !== model.id) });
                                    }
                                  }}
                                  className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div>
                                  <span className="text-slate-700 font-medium">
                                    {model.costInfo?.emoji} {model.displayName}
                                  </span>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {model.contextInfo?.suggestedRole}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-1">
                                    {model.contextInfo?.strengths.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')} • 
                                    {model.contextInfo?.maxTokens ? ` ${(model.contextInfo.maxTokens / 1000).toFixed(0)}K context` : ' Context TBD'}
                                  </div>
                                </div>
                              </div>
                              <span className="text-sm text-slate-500">
                                {model.costInfo ? formatCost(model.costInfo.estimatedCostPerResponse) : 'Price TBD'}/response
                              </span>
                            </div>
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
            
            {/* Smart Recommendations & Analysis */}
            {config.models.length > 0 && config.topic && (
              <>
                {(() => {
                  const diversityAnalysis = analyzePanelDiversity(config.models);
                  const contextAnalysis = calculateContextRequirements(config);
                  const recommendations = getSmartRecommendations(config, availableModels);
                  
                  return (
                    <>
                      {/* Panel Diversity Analysis */}
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-900 mb-2">
                          <CheckCircle size={16} />
                          Panel Analysis (Diversity Score: {diversityAnalysis.diversityScore}%)
                        </div>
                        
                        {diversityAnalysis.warnings.map((warning, idx) => (
                          <div key={idx} className={`flex items-start gap-2 text-sm mb-2 ${
                            warning.severity === 'critical' ? 'text-red-700' : 
                            warning.severity === 'warning' ? 'text-amber-700' : 'text-green-700'
                          }`}>
                            {warning.severity === 'critical' ? <AlertTriangle size={14} className="mt-0.5" /> :
                             warning.severity === 'warning' ? <Info size={14} className="mt-0.5" /> :
                             <CheckCircle size={14} className="mt-0.5" />}
                            <span>{warning.message}</span>
                          </div>
                        ))}
                        
                        {diversityAnalysis.suggestions.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="flex items-center gap-1 text-xs font-semibold text-green-800 mb-1">
                              <Lightbulb size={12} />
                              Suggestions:
                            </div>
                            {diversityAnalysis.suggestions.map((suggestion, idx) => (
                              <div key={idx} className="text-xs text-green-700 ml-4">• {suggestion}</div>
                            ))}
                          </div>
                        )}
                        
                        {/* Role Assignments */}
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <div className="text-xs font-semibold text-green-800 mb-1">Selected Panel Roles:</div>
                          <div className="grid grid-cols-1 gap-1">
                            {config.models.map((model) => (
                              <div key={model.id} className="text-xs text-green-700">
                                <span className="font-medium">{model.displayName}:</span> {model.contextInfo?.suggestedRole}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Context Window Analysis */}
                      {contextAnalysis.warnings.length > 0 && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 mb-2">
                            <AlertTriangle size={16} />
                            Context Window Analysis
                          </div>
                          {contextAnalysis.warnings.map((warning, idx) => (
                            <div key={idx} className={`flex items-start gap-2 text-sm mb-1 ${
                              warning.severity === 'critical' ? 'text-red-700' : 
                              warning.severity === 'warning' ? 'text-amber-700' : 'text-slate-600'
                            }`}>
                              {warning.severity === 'critical' ? <AlertTriangle size={14} className="mt-0.5" /> :
                               <Info size={14} className="mt-0.5" />}
                              <span><strong>{warning.modelName}:</strong> {warning.warning}</span>
                            </div>
                          ))}
                          <div className="text-xs text-amber-600 mt-2">
                            Estimated usage: {contextAnalysis.initialTokens.toLocaleString()} initial tokens + 
                            {contextAnalysis.tokensPerRound.reduce((sum, tokens) => sum + tokens, 0).toLocaleString()} across {config.rounds} rounds = 
                            {contextAnalysis.totalTokensByRound[config.rounds - 1].toLocaleString()} total by round {config.rounds}
                            <br />
                            <span className="text-amber-500">
                              {config.style === 'adversarial' 
                                ? '⚔️ Adversarial mode: responses may get longer as models defend positions'
                                : '🤝 Consensus mode: responses get shorter as models converge'
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Debate Style
            </label>
            <div className="space-y-3">
              <label className="flex items-start p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="debate-style"
                  value="consensus-seeking"
                  checked={config.style === 'consensus-seeking'}
                  onChange={(e) => setConfig({ ...config, style: e.target.value as 'consensus-seeking' | 'adversarial' })}
                  className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 mt-1"
                />
                <div>
                  <span className="text-slate-700 font-medium">🤝 Consensus-Seeking (Business Mode)</span>
                  <p className="text-xs text-slate-500 mt-1">
                    Like tech leads in a room who must agree on ONE solution before leaving. 
                    Models start with different ideas but actively work toward the best shared answer.
                  </p>
                </div>
              </label>
              <label className="flex items-start p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="debate-style"
                  value="adversarial"
                  checked={config.style === 'adversarial'}
                  onChange={(e) => setConfig({ ...config, style: e.target.value as 'consensus-seeking' | 'adversarial' })}
                  className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 mt-1"
                />
                <div>
                  <span className="text-slate-700 font-medium">⚔️ Adversarial (Classical Debate)</span>
                  <p className="text-xs text-slate-500 mt-1">
                    Traditional debate where models argue different sides vigorously. 
                    They challenge each other relentlessly to stress-test all arguments.
                  </p>
                </div>
              </label>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Participation Mode
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="participation-mode"
                  checked={!config.isInteractive}
                  onChange={() => setConfig({ ...config, isInteractive: false })}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-slate-700 font-medium">👀 Observer Mode</span>
                  <p className="text-xs text-slate-500 mt-1">Watch AI models debate and reach their conclusion</p>
                </div>
              </label>
              <label className="flex items-center p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300">
                <input
                  type="radio"
                  name="participation-mode"
                  checked={config.isInteractive || false}
                  onChange={() => setConfig({ ...config, isInteractive: true })}
                  className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="text-slate-700 font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    🎤 Participant Mode
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Join the debate and influence the discussion with your perspective</p>
                </div>
              </label>
            </div>
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
              value={config.rounds || 3}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setConfig({ ...config, rounds: isNaN(value) ? 3 : Math.max(1, Math.min(10, value)) });
              }}
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
                {(() => {
                  const topicAnalysis = analyzeTopicSafety(config.topic, config.description, config.style);
                  const isBlocked = topicAnalysis.severity === 'blocked';
                  const isDisabled = availableModels.length === 0 || config.models.length === 0 || isBlocked;
                  
                  return (
                    <Button 
                      type="submit" 
                      className="w-full text-white font-semibold" 
                      size="lg"
                      disabled={isDisabled}
                    >
                      {availableModels.length === 0 ? 'No Models Available' : 
                       isBlocked ? 'Topic Not Allowed - See Suggestions Above' :
                       `Start Debate (~${formatCost(cost.totalCost)})`}
                    </Button>
                  );
                })()}
              </>
            );
          })()}
        </form>
        )}
      </div>
    </div>
  );
}