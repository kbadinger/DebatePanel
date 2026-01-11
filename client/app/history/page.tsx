'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, RotateCcw } from 'lucide-react';

interface DebateSummary {
  id: string;
  topic: string;
  status: string;
  createdAt: string;
  rounds: number;
  modelSelections: { modelId: string }[];
}

interface PaginatedResponse {
  debates: DebateSummary[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [debates, setDebates] = useState<DebateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [selectedDebates, setSelectedDebates] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    debateId?: string;
    debateIds?: string[];
  }>({ show: false });

  const LIMIT = 20;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/history');
    }
  }, [status, router]);

  const fetchDebates = async (newOffset = 0, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res = await fetch(`/api/debate?limit=${LIMIT}&offset=${newOffset}`);
      const data: PaginatedResponse = await res.json();

      if (append) {
        setDebates(prev => [...prev, ...data.debates]);
      } else {
        setDebates(data.debates);
      }

      setHasMore(data.hasMore);
      setOffset(newOffset);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch debates:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchDebates();
    }
  }, [session]);

  const handleLoadMore = () => {
    fetchDebates(offset + LIMIT, true);
  };

  const handleToggleSelect = (debateId: string) => {
    const newSelected = new Set(selectedDebates);
    if (newSelected.has(debateId)) {
      newSelected.delete(debateId);
    } else {
      newSelected.add(debateId);
    }
    setSelectedDebates(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDebates.size === debates.length) {
      setSelectedDebates(new Set());
    } else {
      setSelectedDebates(new Set(debates.map(d => d.id)));
    }
  };

  const handleDelete = async (debateId?: string, debateIds?: string[]) => {
    setDeleting(true);
    try {
      const res = await fetch('/api/debate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debateId, debateIds })
      });

      if (res.ok) {
        // Remove deleted debates from UI
        const idsToRemove = debateIds || [debateId!];
        setDebates(prev => prev.filter(d => !idsToRemove.includes(d.id)));
        setSelectedDebates(new Set());
        setTotal(prev => prev - idsToRemove.length);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete debate(s)');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete debate(s)');
    } finally {
      setDeleting(false);
      setDeleteConfirm({ show: false });
    }
  };

  const handleDeleteClick = (debateId: string) => {
    setDeleteConfirm({ show: true, debateId });
  };

  const handleBulkDeleteClick = () => {
    setDeleteConfirm({ show: true, debateIds: Array.from(selectedDebates) });
  };

  const confirmDelete = () => {
    if (deleteConfirm.debateId) {
      handleDelete(deleteConfirm.debateId);
    } else if (deleteConfirm.debateIds) {
      handleDelete(undefined, deleteConfirm.debateIds);
    }
  };

  const handleRestart = async (debateId: string) => {
    setRestarting(debateId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_RAILWAY_URL}/api/debate/${debateId}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        // Update the debate status in the list
        setDebates(prev => prev.map(d =>
          d.id === debateId ? { ...d, status: 'pending' } : d
        ));
        // Navigate to the debate page where they can re-run
        router.push(`/debate/${debateId}`);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to restart debate');
      }
    } catch (error) {
      console.error('Failed to restart:', error);
      alert('Failed to restart debate');
    } finally {
      setRestarting(null);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Debate History</h1>
            {total > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {debates.length} of {total} debates
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {selectedDebates.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDeleteClick}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedDebates.size}
                  </>
                )}
              </Button>
            )}
            <Link href="/">
              <Button>New Debate</Button>
            </Link>
          </div>
        </div>

        {debates.length === 0 ? (
          <p className="text-gray-600">No debates yet. Start your first debate!</p>
        ) : (
          <>
            {debates.length > 1 && (
              <div className="mb-4">
                <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDebates.size === debates.length}
                    onChange={handleSelectAll}
                    className="mr-2 h-4 w-4"
                  />
                  Select all
                </label>
              </div>
            )}

            <div className="space-y-4">
              {debates.map(debate => (
                <div
                  key={debate.id}
                  className={`bg-white rounded-lg shadow p-4 transition-colors ${
                    selectedDebates.has(debate.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      checked={selectedDebates.has(debate.id)}
                      onChange={() => handleToggleSelect(debate.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{debate.topic}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(debate.createdAt).toLocaleDateString()} •{' '}
                        {debate.rounds} rounds •{' '}
                        {debate.modelSelections.length} models
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          debate.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : debate.status === 'converged'
                            ? 'bg-blue-100 text-blue-800'
                            : debate.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {debate.status}
                      </span>
                      {debate.status === 'failed' && (
                        <button
                          onClick={() => handleRestart(debate.id)}
                          className="text-amber-600 hover:text-amber-800 p-1"
                          disabled={restarting === debate.id}
                          title="Restart debate"
                        >
                          {restarting === debate.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(debate.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        disabled={deleting}
                        title="Delete debate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link href={`/debate/${debate.id}`}>
                        <Button size="sm" variant="secondary">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${total - debates.length} remaining)`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="text-gray-700 mb-6">
              {deleteConfirm.debateIds
                ? `Are you sure you want to delete ${deleteConfirm.debateIds.length} selected debates? This action cannot be undone.`
                : 'Are you sure you want to delete this debate? This action cannot be undone.'}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm({ show: false })}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
