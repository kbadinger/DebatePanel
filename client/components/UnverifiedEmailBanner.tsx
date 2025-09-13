'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface UnverifiedEmailBannerProps {
  onDismiss?: () => void;
}

export default function UnverifiedEmailBanner({ onDismiss }: UnverifiedEmailBannerProps) {
  const { data: session } = useSession();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if user is verified or not logged in
  if (!session?.user || session.user.emailVerified || isDismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    setIsResending(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Verification email sent! Check your inbox and spam folder.');
      } else {
        setMessage(data.error || 'Failed to resend verification email.');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            Email verification required
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>
              Please verify your email address to unlock your $5 free credits and start creating debates. 
              Check your inbox for a verification email from DecisionForge.
            </p>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {isResending ? 'Sending...' : 'Resend verification email'}
            </button>
            
            {message && (
              <span className={`text-sm ${message.includes('sent') ? 'text-green-700' : 'text-red-700'}`}>
                {message}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex rounded-md p-1.5 text-amber-500 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-amber-50"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}