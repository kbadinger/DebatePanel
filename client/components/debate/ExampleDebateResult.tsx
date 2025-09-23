'use client';

import { ModelResponseCard } from './ModelResponseCard';

export function ExampleDebateResult() {
  const exampleDebate = {
    topic: "Should cities prioritize bike lanes over parking spaces?",
    judgeAnalysis: {
      verdict: "Yes, but with a phased implementation approach",
      reasoning: "After analyzing multiple perspectives, the consensus suggests that bike lanes offer superior long-term benefits for urban mobility, public health, and environmental sustainability. However, successful implementation requires careful planning to address legitimate concerns about parking availability and local business access.",
      keyTakeaways: [
        "Bike lanes reduce traffic congestion more effectively than parking spaces",
        "Health benefits and reduced emissions provide significant economic value",
        "Phased rollout with community input minimizes disruption",
        "Mixed-use streets with both bike lanes and strategic parking work best"
      ],
      confidence: 78
    },
    responses: [
      {
        id: '1',
        modelId: 'gpt-5',
        modelName: 'GPT-5',
        modelProvider: 'openai',
        content: "Cities should prioritize bike lanes as they offer superior returns on infrastructure investment. Studies show that protected bike lanes increase local business revenue by 20-30% due to increased foot traffic, while reducing healthcare costs through improved public health. The space efficiency is compelling: one bike lane can move as many people as four lanes of car traffic during peak hours.",
        position: 'Strongly Support',
        confidence: 88,
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        modelId: 'claude-sonnet-4',
        modelName: 'Claude Sonnet 4',
        modelProvider: 'anthropic',
        content: "While bike lanes offer environmental and health benefits, we must consider equity and accessibility. Many residents - elderly, disabled, or those with long commutes - depend on cars. The solution isn't either/or but strategic placement: bike lanes on parallel streets, maintaining parking near essential services, and ensuring public transit connections. Cities like Copenhagen succeeded through gradual, thoughtful implementation.",
        position: 'Support with Caveats',
        confidence: 75,
        timestamp: new Date().toISOString()
      },
      {
        id: '3',
        modelId: 'gemini-2.5-pro',
        modelName: 'Gemini 2.5 Pro',
        modelProvider: 'google',
        content: "The economic data strongly favors bike infrastructure. Portland's investment in bike lanes generated $90 million in annual economic activity while costing only $60 million to build. Parking spaces, conversely, often operate at a loss when considering land value. However, transition planning is crucial - businesses need loading zones, and residents need alternatives before parking is removed.",
        position: 'Support',
        confidence: 82,
        timestamp: new Date().toISOString()
      },
      {
        id: '4',
        modelId: 'kimi-k2-instruct',
        modelName: 'Kimi K2',
        modelProvider: 'kimi',
        content: "The safety argument is paramount. Cities with extensive bike infrastructure see 40-50% fewer traffic fatalities. Amsterdam and Copenhagen prove this works at scale. However, winter cities face unique challenges - snow removal, ice, and reduced cycling in cold months mean parking remains necessary. The optimal approach varies by climate, density, and existing transit infrastructure.",
        position: 'Cautious Support',
        confidence: 72,
        timestamp: new Date().toISOString()
      },
      {
        id: '5',
        modelId: 'grok-4',
        modelName: 'Grok 4',
        modelProvider: 'xai',
        content: "Let's be real: cars are inefficient in dense urban cores. A parking space costs $20,000-50,000 to build and serves one person. The same space as bike infrastructure serves 8-10 people. The climate crisis demands bold action - transportation accounts for 29% of emissions. Cities that delay this transition will face worse congestion, pollution, and lose talent to more livable cities.",
        position: 'Strongly Support',
        confidence: 91,
        timestamp: new Date().toISOString()
      }
    ],
    convergenceScore: 76,
    unanimousPoints: [
      "Bike infrastructure improves public health and reduces emissions",
      "Strategic planning is essential for successful implementation",
      "Mixed solutions work better than absolute approaches"
    ],
    divergentPoints: [
      "Timeline for transition (immediate vs gradual)",
      "Impact on local businesses during transition",
      "How to address accessibility concerns"
    ]
  };

  return (
    <div className="space-y-6">
      {/* Judge's Verdict - Always First */}
      <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-purple-900">⚖️ Judge&apos;s Verdict</h2>
        
        <div className="mb-6">
          <div className="text-3xl font-bold text-purple-900 mb-2">
            {exampleDebate.judgeAnalysis.verdict}
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <span>Confidence:</span>
            <div className="flex-1 bg-purple-200 rounded-full h-2 max-w-xs">
              <div 
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${exampleDebate.judgeAnalysis.confidence}%` }}
              />
            </div>
            <span>{exampleDebate.judgeAnalysis.confidence}%</span>
          </div>
        </div>
        
        <p className="text-gray-700 mb-6 leading-relaxed">
          {exampleDebate.judgeAnalysis.reasoning}
        </p>
        
        <div>
          <h3 className="font-semibold text-purple-900 mb-3">Key Takeaways:</h3>
          <ul className="space-y-2">
            {exampleDebate.judgeAnalysis.keyTakeaways.map((takeaway, index) => (
              <li key={index} className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span className="text-gray-700">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Consensus Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">Convergence Score</h3>
          <div className="text-2xl font-bold text-green-700">{exampleDebate.convergenceScore}%</div>
          <p className="text-sm text-green-600 mt-1">Models reaching alignment</p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Unanimous Points</h3>
          <div className="text-2xl font-bold text-blue-700">{exampleDebate.unanimousPoints.length}</div>
          <p className="text-sm text-blue-600 mt-1">Areas of full agreement</p>
        </div>
        
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-2">Divergent Points</h3>
          <div className="text-2xl font-bold text-amber-700">{exampleDebate.divergentPoints.length}</div>
          <p className="text-sm text-amber-600 mt-1">Areas needing discussion</p>
        </div>
      </div>

      {/* Model Responses */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Model Perspectives</h3>
        <div className="space-y-4">
          {exampleDebate.responses.map((response) => (
            <ModelResponseCard
              key={response.id}
              response={{...response, round: 3} as any}
            />
          ))}
        </div>
      </div>

      {/* Consensus Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-3">Points of Agreement</h3>
          <ul className="space-y-2">
            {exampleDebate.unanimousPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">{point}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-3">Points of Divergence</h3>
          <ul className="space-y-2">
            {exampleDebate.divergentPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <span className="text-amber-600 mr-2">•</span>
                <span className="text-gray-700">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}