'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from './Logo';
import { Sparkles, Sliders, Mic, ShieldCheck, PlusCircle, Activity } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreating, setIsCreating] = React.useState(false);

  const navItems = [
    { label: 'Audio Studio Overview', href: '/', icon: Sparkles },
    { label: 'Speech Recognition', href: '/#stt-engine', icon: Mic },
    { label: 'Fine-Tuning', href: '/#fine-tuning', icon: Sliders },
  ];

  const handleStartTranscribing = async () => {
    try {
      setIsCreating(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Studio Session ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }),
      });
      const data = await res.json();
      if (data.id) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#080910]/85 border-b border-purple-900/30 shadow-2xl shadow-purple-950/20 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo size="md" />

          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Studio Engine Active</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1.5 bg-[#10121b] border border-slate-800/90 p-1.5 rounded-full shadow-inner shadow-black/40">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/' && pathname === '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-900/50'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-purple-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-[#10121b] border border-slate-800 px-3 py-1.5 rounded-xl font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300">Lossless Audio</span>
          </div>

          <button
            onClick={handleStartTranscribing}
            disabled={isCreating}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-purple-900/40 hover:shadow-purple-600/40 transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isCreating ? 'Creating...' : 'New Session'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
