'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-lg shadow-violet-950/50 border border-violet-500/30',
      secondary:
        'bg-zinc-800/90 hover:bg-zinc-700/90 active:bg-zinc-800 text-zinc-100 border border-zinc-700/80',
      ghost:
        'bg-transparent hover:bg-zinc-800/60 active:bg-zinc-800 text-zinc-300 hover:text-zinc-100',
      danger:
        'bg-rose-600/90 hover:bg-rose-500 active:bg-rose-700 text-white border border-rose-500/30 shadow-lg shadow-rose-950/40',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
