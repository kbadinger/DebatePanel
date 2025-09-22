'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

interface ModelRequest {
  id: string;
  provider: string;
  modelName: string;
  displayName?: string;
  description: string;
  useCase: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  upVotes: number;
  downVotes: number;
  score: number;
}

interface UserVotes {
  [requestId: string]: 'up' | 'down';
}

export default function ModelVotingPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<ModelRequest[]>([]);
  const [userVotes, setUserVotes] = useState<UserVotes>({});
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    provider: '',
    modelName: '',
    displayName: '',
    description: '',
    useCase: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google' },
    { value: 'xai', label: 'X.AI' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'meta', label: 'Meta' },
    { value: 'cohere', label: 'Cohere' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'perplexity', label: 'Perplexity' }
  ];

  const useCases = [
    { value: 'reasoning', label: 'Reasoning & Logic' },
    { value: 'coding', label: 'Code Generation' },
    { value: 'creative', label: 'Creative Writing' },
    { value: 'analysis', label: 'Data Analysis' },
    { value: 'general', label: 'General Purpose' },
    { value: 'multimodal', label: 'Multimodal (Vision/Audio)' }
  ];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/model-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (requestId: string, voteType: 'up' | 'down') => {
    if (!session) return;

    try {
      const response = await fetch(`/api/model-requests/${requestId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ voteType })
      });

      if (response.ok) {
        const { upVotes, downVotes, score } = await response.json();
        
        // Update request in state
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, upVotes, downVotes, score }
            : req
        ));
        
        // Update user votes
        setUserVotes(prev => ({ ...prev, [requestId]: voteType }));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote');
    }
  };

  const handleRemoveVote = async (requestId: string) => {
    if (!session) return;

    try {
      const response = await fetch(`/api/model-requests/${requestId}/vote`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const { upVotes, downVotes, score } = await response.json();
        
        // Update request in state
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, upVotes, downVotes, score }
            : req
        ));
        
        // Remove from user votes
        setUserVotes(prev => {
          const newVotes = { ...prev };
          delete newVotes[requestId];
          return newVotes;
        });
      }
    } catch (error) {
      console.error('Error removing vote:', error);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/model-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormData({
          provider: '',
          modelName: '',
          displayName: '',
          description: '',
          useCase: ''
        });
        setShowRequestForm(false);
        fetchRequests(); // Refresh list
        alert('Model request submitted successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-blue-600 bg-blue-100';
      case 'added': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto pt-12 px-4">
          <div className="text-center">Loading model requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto pt-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Model Voting
          </h1>
          <p className="text-center text-slate-700 text-lg mb-6">
            Request new AI models and vote on what should be added next
          </p>
          
          {session && (
            <div className="text-center">
              <Button 
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                {showRequestForm ? 'Cancel' : 'Request New Model'}
              </Button>
            </div>
          )}
        </div>

        {/* Request Form */}
        {showRequestForm && session && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Request a New Model</h2>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider *
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select provider...</option>
                    {providers.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Use Case *
                  </label>
                  <select
                    value={formData.useCase}
                    onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select use case...</option>
                    {useCases.map(uc => (
                      <option key={uc.value} value={uc.value}>{uc.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    value={formData.modelName}
                    onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                    placeholder="e.g., gpt-5-thinking"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g., GPT-5 Thinking"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why do you want this model? *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain why this model would be valuable for debates..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  minLength={20}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 20 characters</p>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button 
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No model requests yet. Be the first to request one!</p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg">
                        {request.displayName || request.modelName}
                      </span>
                      <span className="text-sm text-gray-500">
                        by {providers.find(p => p.value === request.provider)?.label}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{request.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Use case: {useCases.find(uc => uc.value === request.useCase)?.label}</span>
                      <span>Requested by {request.user.name}</span>
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {session && (
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <button
                          onClick={() => userVotes[request.id] === 'up' 
                            ? handleRemoveVote(request.id)
                            : handleVote(request.id, 'up')
                          }
                          className={`p-2 rounded-md transition-colors ${
                            userVotes[request.id] === 'up' 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'
                          }`}
                        >
                          ↑
                        </button>
                        <div className="text-sm font-medium">{request.upVotes}</div>
                      </div>
                      
                      <div className="text-center mx-2">
                        <div className={`text-lg font-bold ${
                          request.score > 0 ? 'text-green-600' : 
                          request.score < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {request.score > 0 ? '+' : ''}{request.score}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <button
                          onClick={() => userVotes[request.id] === 'down' 
                            ? handleRemoveVote(request.id)
                            : handleVote(request.id, 'down')
                          }
                          className={`p-2 rounded-md transition-colors ${
                            userVotes[request.id] === 'down' 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
                          }`}
                        >
                          ↓
                        </button>
                        <div className="text-sm font-medium">{request.downVotes}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {!session && (
          <div className="text-center py-8">
            <p className="text-gray-500">Please sign in to request models and vote.</p>
          </div>
        )}
      </div>
    </div>
  );
}

















