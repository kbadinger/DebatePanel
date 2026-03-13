'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { CheckCircle, Users, Zap, Shield } from 'lucide-react';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-xl p-8 border border-slate-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">You're on the list</h1>
            <p className="text-slate-600 mb-6">
              We're onboarding new users in small batches to ensure quality.
              We'll reach out when a spot opens up.
            </p>
            <p className="text-sm text-slate-500">
              In the meantime, read about{' '}
              <a
                href="https://kevinbadinger.com/work/decisionforge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                how DecisionForge works
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-xl p-8 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
              <Users className="w-4 h-4 mr-1.5" />
              Limited Access
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Request Early Access</h1>
            <p className="text-slate-600">
              DecisionForge uses multi-model AI debate to surface better decisions.
              We're onboarding users gradually to maintain quality.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Request Access'}
            </Button>
          </form>

          <div className="border-t border-slate-100 pt-6 space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600">
                Multiple AI models debate to find blind spots single models miss
              </span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600">
                Built-in grounding checks prevent hallucinated recommendations
              </span>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have access?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
