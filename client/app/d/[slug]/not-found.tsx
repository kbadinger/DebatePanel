import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-slate-100 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Debate Not Found</h1>
        <p className="text-slate-600 mb-6">
          This debate doesn't exist or isn't publicly available.
        </p>
        <div className="space-y-3">
          <Link href="/" className="block">
            <Button className="w-full">
              Go to Homepage
            </Button>
          </Link>
          <Link href="/signup" className="block">
            <Button variant="secondary" className="w-full">
              Request Access
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
