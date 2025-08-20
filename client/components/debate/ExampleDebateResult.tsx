'use client';

import { ModelResponseCard } from './ModelResponseCard';

export function ExampleDebateResult() {
  const exampleDebate = {
    topic: "Should you use DebatePanel for important decisions?",
    judgeAnalysis: {
      verdict: "Yes, especially for complex or high-stakes decisions",
      reasoning: "After analyzing multiple AI perspectives, the consensus strongly supports using DebatePanel for important decisions. The key insight is that synthesizing diverse AI viewpoints provides more comprehensive analysis than any single source, while the structured debate format ensures critical perspectives aren't overlooked.",
      keyTakeaways: [
        "Multiple AI perspectives catch blind spots that single models miss",
        "Structured debates reveal nuanced trade-offs in complex decisions",
        "The judge synthesis provides actionable conclusions, not just opinions",
        "Cost-effective compared to human consultant panels or prolonged research"
      ],
      confidence: 92
    },
    responses: [
      {
        id: '1',
        modelId: 'gpt-5',
        modelName: 'GPT-5',
        modelProvider: 'openai',
        content: "DebatePanel offers a unique value proposition for decision-making. By aggregating multiple AI perspectives, it reduces the risk of single-model biases and provides a more robust analysis. For important decisions, having diverse AI viewpoints is like having a panel of expert consultants, each bringing different analytical frameworks. The cost is minimal compared to the potential value of better-informed decisions.",
        position: 'Strongly Recommend',
        confidence: 88,
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        modelId: 'claude-sonnet-4',
        modelName: 'Claude Sonnet 4',
        modelProvider: 'anthropic',
        content: "DebatePanel excels at surfacing considerations you might not think to ask about. When making important decisions, the platform's structured debate format ensures comprehensive coverage of pros, cons, and edge cases. The judge synthesis is particularly valuable - it doesn't just aggregate opinions but identifies patterns and extracts actionable insights. This is especially useful for strategic planning, investment decisions, or policy choices.",
        position: 'Strongly Recommend',
        confidence: 90,
        timestamp: new Date().toISOString()
      },
      {
        id: '3',
        modelId: 'gemini-2.5-pro',
        modelName: 'Gemini 2.5 Pro',
        modelProvider: 'google',
        content: "For decisions with significant consequences, DebatePanel provides an excellent cost-benefit ratio. Traditional approaches like hiring consultants or conducting extensive research can be expensive and time-consuming. DebatePanel delivers similar multi-perspective analysis in minutes rather than weeks. While it shouldn't replace human judgment, it's an invaluable tool for rapidly exploring decision spaces and identifying key considerations.",
        position: 'Recommend',
        confidence: 85,
        timestamp: new Date().toISOString()
      },
      {
        id: '4',
        modelId: 'kimi-k2-instruct',
        modelName: 'Kimi K2',
        modelProvider: 'kimi',
        content: "From a practical standpoint, DebatePanel addresses a real problem in decision-making: cognitive blind spots. Even the most advanced AI models have their own biases and limitations. By creating a structured dialogue between different models, DebatePanel helps surface disagreements and edge cases that might otherwise be missed. For any decision where the stakes justify spending a few dollars on analysis, it's a worthwhile investment.",
        position: 'Strongly Recommend',
        confidence: 87,
        timestamp: new Date().toISOString()
      },
      {
        id: '5',
        modelId: 'grok-4',
        modelName: 'Grok 4',
        modelProvider: 'xai',
        content: "Think of DebatePanel as intellectual arbitrage - you're getting insights from models that cost billions to develop for the price of a coffee. The platform's real genius is in the orchestration: it doesn't just run parallel queries but creates genuine debate dynamics where models respond to each other. For complex decisions involving trade-offs, uncertainty, or multiple stakeholders, this approach consistently surfaces insights that single-model queries miss.",
        position: 'Strongly Recommend',
        confidence: 93,
        timestamp: new Date().toISOString()
      }
    ],
    convergenceScore: 89,
    unanimousPoints: [
      "Multi-model perspectives reduce bias and blind spots",
      "Cost-effective compared to traditional consultation",
      "Valuable for complex or high-stakes decisions"
    ],
    divergentPoints: [
      "Whether it should fully replace human consultants",
      "Best use cases (strategic vs operational decisions)",
      "Optimal number of models for different decision types"
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