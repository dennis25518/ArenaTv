'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SIDEBAR_ITEMS } from '@/constants';

interface SidebarProps {
  active: string;
  setActive: (v: string) => void;
}

export const Sidebar = ({ active, setActive }: SidebarProps) => {
  return (
    <aside className="hidden lg:flex w-[80px] bg-white border-r border-[var(--color-border-main)] flex-col items-center py-6 h-[calc(100vh-64px)] lg:h-[calc(100vh-72px)] sticky top-[64px] lg:top-[72px] shrink-0 z-30">
      <div className="flex flex-col gap-6 w-full items-center">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = active === item.label;

          return (
            <button
              key={item.label}
              onClick={() => setActive(item.label)}
              className="flex flex-col items-center gap-1.5 transition-all group relative px-2 py-1.5 w-full cursor-pointer select-none"
            >
              <div className={`p-2 rounded-xl transition-all ${
                isActive 
                  ? 'bg-[var(--color-brand)] text-white shadow-md shadow-[var(--color-brand)]/30' 
                  : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] group-hover:bg-gray-100/80'
              }`}>
                <item.icon 
                  size={20} 
                  className="stroke-[1.75px]" 
                />
              </div>

              <span className={`text-[10px] font-semibold transition-colors ${
                isActive 
                  ? 'text-[var(--color-brand)]' 
                  : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'
              }`}>
                {item.label}
              </span>

              {isActive && (
                <motion.div 
                  layoutId="active-nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-[var(--color-brand)] rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
