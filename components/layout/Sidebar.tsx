'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { SIDEBAR_ITEMS } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useStream } from '@/context/StreamContext';

interface SidebarProps {
  active: string;
  setActive: (v: string) => void;
}

export const Sidebar = ({ active, setActive }: SidebarProps) => {
  const { user } = useAuth();
  const { subscription } = useStream();

  return (
    <aside className="hidden lg:flex w-[80px] bg-white border-r border-[var(--color-border-main)] flex-col items-center py-6 h-[calc(100vh-64px)] lg:h-[calc(100vh-72px)] sticky top-[64px] lg:top-[72px] shrink-0 z-30 transition-colors">
      <div className="flex flex-col gap-6 w-full items-center">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = active === item.label;
          const isProfileItem = item.label === 'Profile';
          const isLocked = !isProfileItem && !subscription.isActive;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setActive(item.label)}
              title={
                isLocked
                  ? 'Activate your subscription or apply a promo code to unlock'
                  : item.label
              }
              className="flex flex-col items-center justify-center gap-1.5 transition-all group relative px-2 py-2 w-full cursor-pointer select-none hover:bg-gray-50/60 dark:hover:bg-gray-800/30 rounded-xl"
            >
              {isLocked && (
                <span className="absolute top-1.5 right-3.5 w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xs">
                  <Lock size={8} />
                </span>
              )}
              {isProfileItem && user ? (
                <div className="w-6 h-6 flex items-center justify-center">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                    alt="Profile"
                    className={`w-6 h-6 rounded-full object-cover border transition-all ${
                      isActive
                        ? 'border-[var(--color-brand)] ring-1.5 ring-[var(--color-brand)]'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                </div>
              ) : (
                <item.icon
                  size={22}
                  className={`transition-colors stroke-[1.75px] ${
                    isActive
                      ? 'text-[var(--color-brand)]'
                      : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'
                  }`}
                />
              )}

              <span
                className={`text-[10px] font-semibold transition-colors ${
                  isActive
                    ? 'text-[var(--color-brand)]'
                    : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
