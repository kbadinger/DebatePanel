import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-12">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <a
              href="https://resolventtech.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-700 transition-colors"
            >
              Terms
            </a>
            <a
              href="https://resolventtech.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-700 transition-colors"
            >
              Privacy
            </a>
            <a
              href="https://resolventtech.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-700 transition-colors"
            >
              Contact
            </a>
          </div>

          {/* Copyright */}
          <div className="text-sm text-slate-400">
            © {new Date().getFullYear()} Operated by{' '}
            <a
              href="https://resolventtech.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              Resolvent Technologies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
