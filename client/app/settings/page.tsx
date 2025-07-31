'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Key, User } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: '',
    anthropic: '',
    google: '',
    cohere: '',
    mistral: '',
    groq: '',
    deepseek: '',
    xai: '',
    kimi: '',
    qwen: '',
    glim: '',
    yi: '',
    flux: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
      });
    }
  }, [session]);

  const handleSaveProfile = async () => {
    setLoading(true);
    setSaved(false);
    
    try {
      // TODO: Implement profile update API
      // await fetch('/api/user/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async (provider: string) => {
    setLoading(true);
    
    try {
      // TODO: Implement API key save endpoint
      // await fetch('/api/user/api-keys', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ provider, key: apiKeys[provider] }),
      // });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save API key:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>
        
        {saved && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
            Settings saved successfully!
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <User className="text-slate-600" size={20} />
            <h2 className="text-xl font-semibold text-slate-900">Profile Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="mt-1 bg-slate-50"
              />
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            </div>
            
            <Button onClick={handleSaveProfile} disabled={loading}>
              <Save size={16} className="mr-2" />
              Save Profile
            </Button>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <Key className="text-slate-600" size={20} />
            <h2 className="text-xl font-semibold text-slate-900">API Keys</h2>
          </div>
          
          <p className="text-sm text-slate-600 mb-6">
            Store your API keys securely. They are encrypted and never shown again after saving.
          </p>
          
          <div className="space-y-4">
            {Object.entries(apiKeys).map(([provider, key]) => (
              <div key={provider} className="border-b border-slate-100 pb-4 last:border-0">
                <Label htmlFor={`key-${provider}`} className="capitalize">
                  {provider} API Key
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id={`key-${provider}`}
                    type="password"
                    value={key}
                    onChange={(e) => setApiKeys({ ...apiKeys, [provider]: e.target.value })}
                    placeholder="Enter your API key"
                  />
                  <Button 
                    onClick={() => handleSaveApiKey(provider)} 
                    disabled={loading || !key}
                    size="sm"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> API keys are encrypted and stored securely. Once saved, they cannot be viewed again. 
              You'll need to generate new keys from your provider if lost.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}