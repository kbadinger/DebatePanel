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
  adminNotes?: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  upVotes: number;
  downVotes: number;
  score: number;
}

export default function AdminModelRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<ModelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchRequests();
    }
  }, [session]);

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

  const updateRequestStatus = async (requestId: string, status: string, adminNotes?: string) => {
    try {
      const response = await fetch(`/api/admin/model-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, adminNotes })
      });

      if (response.ok) {
        fetchRequests(); // Refresh the list
        alert(`Request ${status} successfully!`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update request');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request');
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

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const sortedRequests = filteredRequests.sort((a, b) => {
    // Sort by score (highest first), then by date (newest first)
    if (a.score !== b.score) return b.score - a.score;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (!session?.user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto pt-12 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

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
            Model Requests Admin
          </h1>
          <p className="text-center text-slate-700 text-lg mb-6">
            Review and manage user model requests
          </p>
          
          {/* Filter Tabs */}
          <div className="flex justify-center gap-2">
            {['all', 'pending', 'approved', 'added', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  filter === status 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-blue-100'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} 
                ({requests.filter(r => status === 'all' || r.status === status).length})
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-6">
          {sortedRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No requests found for the selected filter.</p>
            </div>
          ) : (
            sortedRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-xl">
                        {request.displayName || request.modelName}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({request.provider})
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      <div className={`text-lg font-bold ml-4 ${
                        request.score > 0 ? 'text-green-600' : 
                        request.score < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        Score: {request.score > 0 ? '+' : ''}{request.score}
                      </div>
                      <span className="text-sm text-gray-500">
                        ({request.upVotes}↑ {request.downVotes}↓)
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-gray-700 font-medium">Description:</p>
                      <p className="text-gray-600">{request.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span>Use case: <strong>{request.useCase}</strong></span>
                      <span>Requested by: <strong>{request.user.name}</strong> ({request.user.email})</span>
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>

                    {request.adminNotes && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm font-medium text-gray-700">Admin Notes:</p>
                        <p className="text-sm text-gray-600">{request.adminNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Actions */}
                {request.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => updateRequestStatus(request.id, 'approved', 'Approved for implementation')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        const notes = prompt('Add admin notes (optional):');
                        updateRequestStatus(request.id, 'rejected', notes || 'Rejected by admin');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        const notes = prompt('Add notes about the implementation:');
                        updateRequestStatus(request.id, 'added', notes || 'Model has been added to the platform');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                    >
                      Mark as Added
                    </Button>
                  </div>
                )}

                {request.status === 'approved' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => {
                        const notes = prompt('Add notes about the implementation:');
                        updateRequestStatus(request.id, 'added', notes || 'Model has been added to the platform');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                    >
                      Mark as Added
                    </Button>
                    <Button
                      onClick={() => updateRequestStatus(request.id, 'pending', 'Moved back to pending')}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2"
                    >
                      Back to Pending
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}












