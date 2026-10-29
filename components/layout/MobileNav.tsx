'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SIDEBAR_ITEMS } from '@/constants';
import { useAuth } from '@/context/AuthContext';

interface MobileNavProps {
  active: string;
  setActive: (v: string) => void;
}

export const MobileNav = ({ active, setActive }: MobileNavProps) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;

          // Always show when near the top of the page
          if (currentY <= 20) {
            setIsVisible(true);
          } else {
            const diff = currentY - lastScrollY.current;
            // 8px threshold to prevent stutter on tiny scroll moves
            if (diff > 8) {
              // Scrolling down -> hide navbar
              setIsVisible(false);
            } else if (diff < -8) {
              // Scrolling up -> restore navbar
              setIsVisible(true);
            }
          }

          lastScrollY.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: 0, opacity: 1 }}
      animate={{
        y: isVisible ? 0 : 90,
        opacity: isVisible ? 1 : 0,
      }}
      transition={{
        y: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.22, ease: 'easeOut' },
      }}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      className="lg:hidden fixed bottom-4 left-4 right-4 max-w-md mx-auto h-[60px] bg-white/95 dark:bg-[#15161e]/95 backdrop-blur-md rounded-2xl border border-[var(--color-border-main)] shadow-xl shadow-black/10 px-3 flex items-center justify-around z-50 transition-colors"
    >
      {SIDEBAR_ITEMS.map((item) => {
        const isActive = active === item.label;
        const isProfileItem = item.label === 'Profile';

        return (
          <button
            key={item.label}
            type="button"
            onClick={() => setActive(item.label)}
            className="flex flex-col items-center justify-center gap-1 relative px-3 py-1 cursor-pointer select-none transition-transform active:scale-95"
          >
            {isProfileItem && user ? (
              <div className="w-5 h-5 flex items-center justify-center">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt="Profile"
                  className={`w-5 h-5 rounded-full object-cover border transition-all ${
                    isActive
                      ? 'border-[var(--color-brand)] ring-1.5 ring-[var(--color-brand)]'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
            ) : (
              <item.icon
                size={20}
                className={`transition-colors stroke-[1.75px] ${
                  isActive ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-secondary)]'
                }`}
              />
            )}

            <span
              className={`text-[10px] font-semibold transition-colors ${
                isActive ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </motion.nav>
  );
};
