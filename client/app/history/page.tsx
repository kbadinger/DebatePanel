'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DebateSummary {
  id: string;
  topic: string;
  status: string;
  createdAt: string;
  rounds: number;
  modelSelections: { modelId: string }[];
}

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [debates, setDebates] = useState<DebateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/history');
    }
  }, [status, router]);
  
  useEffect(() => {
    if (session) {
      fetch('/api/debate')
        .then(res => res.json())
        .then(data => {
          setDebates(data);
          setLoading(false);
        });
    }
  }, [session]);
  
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
          <h1 className="text-3xl font-bold">Debate History</h1>
          <Link href="/">
            <Button>New Debate</Button>
          </Link>
        </div>
        
        {debates.length === 0 ? (
          <p className="text-gray-600">No debates yet. Start your first debate!</p>
        ) : (
          <div className="space-y-4">
            {debates.map(debate => (
              <div key={debate.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{debate.topic}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(debate.createdAt).toLocaleDateString()} • 
                      {debate.rounds} rounds • 
                      {debate.modelSelections.length} models
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      debate.status === 'completed' ? 'bg-green-100 text-green-800' :
                      debate.status === 'converged' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {debate.status}
                    </span>
                    <Link href={`/debate/${debate.id}`}>
                      <Button size="sm" variant="secondary">View</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}