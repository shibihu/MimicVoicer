import React from 'react';
import Link from 'next/link';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group focus:outline-none">
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-2 shadow-lg shadow-purple-900/20 group-hover:shadow-purple-600/30 transition-all duration-300`}>
        <svg
          className={`${iconSizes[size]} text-white`}
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
        <span className={`${textSizes[size]} font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent`}>
          Mimic<span className="text-purple-400 font-black">Voicer</span>
        </span>
      </div>
    </Link>
  );
}
