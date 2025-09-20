import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient' | 'neon';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={clsx(
          'inline-flex items-center justify-center rounded-xl font-bold transition-all transform',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'hover:scale-105 active:scale-95',
          {
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl focus-visible:ring-purple-500': variant === 'primary',
            'bg-white/80 backdrop-blur text-slate-900 hover:bg-white border-2 border-slate-200 hover:border-purple-400 shadow-md hover:shadow-lg focus-visible:ring-slate-400': variant === 'secondary',
            'hover:bg-slate-100/80 backdrop-blur hover:text-slate-900 focus-visible:ring-slate-400': variant === 'ghost',
            'gradient-bg-primary text-white shadow-xl hover:shadow-2xl focus-visible:ring-purple-500 relative overflow-hidden': variant === 'gradient',
            'bg-black text-green-400 border-2 border-green-400 hover:text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:shadow-[0_0_30px_rgba(34,197,94,0.8)] focus-visible:ring-green-400': variant === 'neon',
          },
          {
            'h-9 px-4 text-sm': size === 'sm',
            'h-11 px-6 text-base': size === 'md',
            'h-13 px-10 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {variant === 'gradient' && (
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
        )}
        <span className="relative z-10">{props.children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

// Add shimmer animation to globals.css
const shimmerKeyframes = `
@keyframes shimmer {
  0% { transform: translateX(-100%) skewX(-12deg); }
  100% { transform: translateX(200%) skewX(-12deg); }
}

.animate-shimmer {
  animation: shimmer 3s infinite;
}
`;