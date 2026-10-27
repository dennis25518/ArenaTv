'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  active?: string;
  setActive?: (v: string) => void;
  user?: any;
  onLogin?: () => void;
  onSubscribe?: () => void;
  onLogoutClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ setActive }) => {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('arenax_theme', 'dark');
      } catch (e) {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('arenax_theme', 'light');
      } catch (e) {}
    }
  };

  return (
    <header className="h-[64px] lg:h-[72px] bg-white border-b border-[var(--color-border-main)] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-40 w-full transition-colors">
      {/* Far Left: ArenaX Logo */}
      <div 
        onClick={() => setActive && setActive('Channels')}
        className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--color-brand)] to-[#ff4d4f] flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-105 transition-transform">
          A
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            ArenaX
          </span>
          <span className="bg-[var(--color-live-red)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm animate-pulse">
            Live
          </span>
        </div>
      </div>

      {/* Far Right: Dark / Light Theme Toggle */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="flex items-center gap-1 p-1 rounded-full bg-gray-100 border border-[var(--color-border-main)] transition-all cursor-pointer shadow-xs select-none hover:border-gray-400/60"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {/* Light Mode Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              mounted && !isDark
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Sun size={15} className={mounted && !isDark ? 'text-amber-500 fill-amber-500' : 'text-gray-400'} />
            <span className="hidden sm:inline">Light</span>
          </div>

          {/* Dark Mode Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              mounted && isDark
                ? 'bg-[#1f212c] text-white shadow-xs'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Moon size={15} className={mounted && isDark ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'} />
            <span className="hidden sm:inline">Dark</span>
          </div>
        </button>
      </div>
    </header>
  );
};
