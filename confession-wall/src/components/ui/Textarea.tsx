'use client';

import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={`w-full rounded-xl bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 resize-none ${
            error
              ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/40'
              : 'border-zinc-800 focus:border-violet-500/70 focus:ring-violet-500/40'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
