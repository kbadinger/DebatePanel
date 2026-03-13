'use client';

import { useState } from 'react';

interface ImportResult {
  success: boolean;
  matched: number;
  unmatched: number;
  updated: number;
  errors?: string[];
  details?: string;
}

export default function CostImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFile(selectedFile || null);
    setResult(null); // Clear previous results
  };

  const handleImport = async () => {
    if (!file || !provider) {
      alert('Please select a file and provider');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('provider', provider);

      const response = await fetch('/api/admin/costs/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Import failed:', error);
      setResult({
        success: false,
        matched: 0,
        unmatched: 0,
        updated: 0,
        errors: ['Network error or server failure'],
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Cost Data Import</h1>
        <div className="text-sm text-slate-500">
          Import real cost data from provider dashboards
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">Import Instructions</h2>
        <div className="space-y-4 text-sm text-blue-800">
          <div>
            <h3 className="font-medium">DeepSeek:</h3>
            <p>Export from platform.deepseek.com → Usage → Export CSV</p>
          </div>
          <div>
            <h3 className="font-medium">X.AI (Grok):</h3>
            <p>Export from console.x.ai → Billing → Export Usage Data</p>
          </div>
          <div>
            <h3 className="font-medium">Mistral:</h3>
            <p>Export from console.mistral.ai → Usage → Export CSV</p>
          </div>
          <div>
            <h3 className="font-medium">Meta/Llama:</h3>
            <p>Export from Together AI or Replicate dashboard → Billing</p>
          </div>
        </div>
      </div>

      {/* Import Form */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Cost Data</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
              Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select Provider</option>
              <option value="deepseek">DeepSeek</option>
              <option value="xai">X.AI (Grok)</option>
              <option value="mistral">Mistral</option>
              <option value="meta">Meta (Llama)</option>
              <option value="perplexity">Perplexity</option>
            </select>
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
              CSV File
            </label>
            <input
              type="file"
              id="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={!file || !provider || importing}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import Cost Data'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className={`rounded-lg p-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
            {result.success ? 'Import Successful!' : 'Import Failed'}
          </h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Records Matched:</span>
              <span className="font-medium">{result.matched}</span>
            </div>
            <div className="flex justify-between">
              <span>Records Unmatched:</span>
              <span className="font-medium">{result.unmatched}</span>
            </div>
            <div className="flex justify-between">
              <span>Records Updated:</span>
              <span className="font-medium text-green-600">{result.updated}</span>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-red-900 mb-2">Errors:</h3>
              <ul className="text-sm text-red-800 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.details && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Details:</h3>
              <p className="text-sm bg-white p-3 rounded border">{result.details}</p>
            </div>
          )}
        </div>
      )}

      {/* Expected CSV Format */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Expected CSV Format</h2>
        <div className="text-sm text-gray-700 space-y-2">
          <p>The CSV should contain the following columns (headers are flexible):</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>timestamp/date:</strong> When the API call was made</li>
            <li><strong>model:</strong> Model name (e.g., "deepseek-chat", "grok-2")</li>
            <li><strong>cost/amount:</strong> Actual cost in USD</li>
            <li><strong>input_tokens/prompt_tokens:</strong> Input token count (optional)</li>
            <li><strong>output_tokens/completion_tokens:</strong> Output token count (optional)</li>
          </ul>
        </div>
        
        <div className="mt-4 p-3 bg-white rounded border font-mono text-xs">
          <div>timestamp,model,cost,input_tokens,output_tokens</div>
          <div>2025-01-19T10:30:00Z,deepseek-chat,0.0021,1500,200</div>
          <div>2025-01-19T10:31:15Z,grok-2,0.0045,2000,150</div>
        </div>
      </div>
    </div>
  );
}