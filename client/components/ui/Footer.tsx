export function Footer() {
  return (
    <footer className="border-t border-slate-200/50 bg-gradient-to-b from-transparent to-slate-50/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Links */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <a
              href="https://resolventtech.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 transition-colors"
            >
              Terms
            </a>
            <span className="text-slate-300">·</span>
            <a
              href="https://resolventtech.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 transition-colors"
            >
              Privacy
            </a>
            <span className="text-slate-300">·</span>
            <a
              href="https://resolventtech.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 transition-colors"
            >
              Contact
            </a>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()}{' '}
            <a
              href="https://resolventtech.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 transition-colors"
            >
              Resolvent Technologies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
