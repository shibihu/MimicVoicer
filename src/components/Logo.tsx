import React from 'react';
import Link from 'next/link';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <Link href="/" className="inline-flex items-center gap-3 group focus:outline-none">
      <div className="relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-2.5 shadow-lg shadow-purple-950/50 group-hover:shadow-purple-600/40 transition-all duration-300">
        <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-md group-hover:blur-lg transition-all" />
        <svg
          className={`${iconSizes[size]} text-white relative z-10`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v3" />
          <path d="M7 8v10" />
          <path d="M10 4v16" />
          <path d="M13 6v14" />
          <path d="M16 9v7" />
          <path d="M19 11v3" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className={`${textSizes[size]} font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent`}>
          Mimic<span className="text-purple-400">Voicer</span>
        </span>
        <span className="text-[10px] font-bold tracking-widest uppercase text-purple-400/80 -mt-1 font-mono">
          Audio Studio
        </span>
      </div>
    </Link>
  );
}
