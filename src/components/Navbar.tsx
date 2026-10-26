'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from './Logo';
import { Sparkles, FolderKanban, Mic, Settings, PlusCircle } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreating, setIsCreating] = React.useState(false);

  const navItems = [
    { label: 'Home', href: '/', icon: Sparkles },
    { label: 'My Projects', href: '/projects', icon: FolderKanban },
    { label: 'Audio Studio', href: '/studio', icon: Mic },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleStartTranscribing = async () => {
    try {
      setIsCreating(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Studio Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/studio/${data.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090a0f]/80 border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <Logo size="md" />

        <nav className="hidden md:flex items-center gap-1 bg-[#12141c] border border-slate-800/80 p-1.5 rounded-full shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStartTranscribing}
            disabled={isCreating}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-purple-900/20 hover:shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isCreating ? 'Creating...' : 'Start Transcribing'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
