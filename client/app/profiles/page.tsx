'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Profile {
  id: string;
  name: string;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profiles');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchProfiles();
    }
  }, [session]);

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles');
      const data = await response.json();
      if (data.profiles) {
        setProfiles(data.profiles);
      }
    } catch (err) {
      setError('Failed to load profiles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormContent('');
    setFormError(null);
    setIsCreating(false);
    setEditingId(null);
  };

  const startCreate = () => {
    resetForm();
    setFormContent(JSON.stringify({
      background: '',
      goals: [],
      preferences: {},
      context: ''
    }, null, 2));
    setIsCreating(true);
  };

  const startEdit = (profile: Profile) => {
    resetForm();
    setFormName(profile.name);
    setFormContent(JSON.stringify(profile.content, null, 2));
    setEditingId(profile.id);
  };

  const handleSave = async () => {
    setFormError(null);
    setSaving(true);

    try {
      // Parse JSON content
      let content: Record<string, unknown>;
      try {
        content = JSON.parse(formContent);
      } catch {
        setFormError('Invalid JSON in content');
        setSaving(false);
        return;
      }

      const body = { name: formName, content };

      if (editingId) {
        // Update
        const response = await fetch(`/api/profiles/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) {
          setFormError(data.error || 'Failed to update profile');
          setSaving(false);
          return;
        }
      } else {
        // Create
        const response = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) {
          setFormError(data.error || 'Failed to create profile');
          setSaving(false);
          return;
        }
      }

      resetForm();
      fetchProfiles();
    } catch (err) {
      setFormError('Failed to save profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchProfiles();
      }
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Debates
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Background Profiles</h1>
          <p className="text-slate-600 mt-2">
            Create profiles to provide personal context in debates. Use <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">@profile-name</code> in your topic to include profile context.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editingId ? 'Edit Profile' : 'Create New Profile'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Profile Name (for @mention)
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., kevin-work, personal, business"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!editingId}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Profile Content (JSON)
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder='{"background": "...", "goals": [...], ...}'
                />
                <p className="text-xs text-slate-500 mt-1">
                  Flexible JSON structure. Include any relevant context like background, goals, preferences, constraints, etc.
                </p>
              </div>

              {formError && (
                <div className="text-red-600 text-sm">{formError}</div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving || !formName.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Profile' : 'Create Profile'}
                </Button>
                <Button
                  onClick={resetForm}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Profile List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Your Profiles ({profiles.length}/10)</h2>
            {!isCreating && !editingId && (
              <Button
                onClick={startCreate}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Profile
              </Button>
            )}
          </div>

          {profiles.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No profiles yet. Create one to add personal context to your debates.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {profiles.map((profile) => (
                <div key={profile.id} className="p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-medium">
                          @{profile.name}
                        </code>
                        <span className="text-xs text-slate-400">
                          Updated {new Date(profile.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <pre className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded overflow-x-auto max-h-24">
                        {JSON.stringify(profile.content, null, 2)}
                      </pre>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => startEdit(profile)}
                        size="sm"
                        variant="ghost"
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(profile.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Example */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to use profiles</h3>
          <p className="text-blue-800 text-sm mb-3">
            Include <code className="bg-blue-100 px-1 py-0.5 rounded">@profile-name</code> in your debate topic or description to inject that profile&apos;s context.
          </p>
          <div className="bg-white rounded-lg p-3 text-sm">
            <p className="text-slate-600 mb-1">Example topic:</p>
            <p className="text-slate-900">&quot;Should <code className="bg-blue-50 text-blue-700 px-1 rounded">@kevin-work</code> take the job offer from Google?&quot;</p>
          </div>
        </div>
      </div>
    </div>
  );
}
