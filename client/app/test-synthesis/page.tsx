'use client';

import { useState } from 'react';

export default function TestSynthesis() {
  const [synthesis, setSynthesis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    console.log(message);
  };

  const testDebate = async () => {
    setLoading(true);
    setSynthesis('');
    setLog([]);
    addLog('Starting test debate...');

    const config = {
      topic: "Test Debate",
      description: "Should AI prioritize safety over innovation?",
      models: [
        { 
          id: "gpt-5", 
          provider: "openai", 
          name: "gpt-5", 
          displayName: "GPT-5",
          category: "frontier"
        },
        { 
          id: "claude-opus-4-1-20250805", 
          provider: "anthropic", 
          name: "claude-opus-4-1-20250805", 
          displayName: "Claude Opus 4.1",
          category: "frontier"
        }
      ],
      rounds: 1,
      format: "structured",
      style: "consensus-seeking",
      convergenceThreshold: 0.75,
      isInteractive: false,
      judge: {
        enabled: false
      }
    };

    try {
      addLog(`Sending config: ${JSON.stringify(config, null, 2)}`);
      
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),  // Wrap config in an object
      });

      addLog(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog(`Error response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              addLog(`Received event: ${data.type}`);
              
              if (data.type === 'debate-complete') {
                addLog('Debate completed!');
                addLog(`Has synthesis: ${!!data.data.finalSynthesis}`);
                addLog(`Synthesis length: ${data.data.finalSynthesis?.length || 0}`);
                
                if (data.data.finalSynthesis) {
                  setSynthesis(data.data.finalSynthesis);
                  addLog('Synthesis set successfully');
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      addLog(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Test Synthesis Display</h1>
      
      <button
        onClick={testDebate}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400 mb-4"
      >
        {loading ? 'Running...' : 'Run Test Debate'}
      </button>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Log:</h2>
        <div className="bg-gray-100 p-4 rounded h-48 overflow-y-auto">
          {log.map((entry, i) => (
            <div key={i} className="text-sm font-mono">{entry}</div>
          ))}
        </div>
      </div>

      {synthesis && (
        <div className="mt-8 p-6 bg-green-50 border-2 border-green-500 rounded">
          <h2 className="text-xl font-bold mb-4">Synthesis Received!</h2>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap">{synthesis}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
