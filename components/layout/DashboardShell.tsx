'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useStream } from '@/context/StreamContext';

interface DashboardShellProps {
  activePage: 'Channels' | 'My List' | 'Community' | 'Profile';
  children: React.ReactNode;
}

const ROUTE_MAP: Record<string, string> = {
  Channels: '/channels',
  'My List': '/list',
  Community: '/community',
  Profile: '/profile',
};

export const DashboardShell: React.FC<DashboardShellProps> = ({
  activePage,
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const { user: authUser, profile, loading: authLoading } = useAuth();
  const { subscription } = useStream();
  const prevSubActive = useRef<boolean>(subscription.isActive);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('locked') === '1' && !subscription.isActive) {
        setLockNotice(
          'Please activate your ArenaX Pro plan or apply a Promo Code below to unlock Live TV channels.'
        );
        const timer = setTimeout(() => setLockNotice(null), 4500);
        return () => clearTimeout(timer);
      }
    }
  }, [subscription.isActive]);

  // Enforce authentication: unauthenticated visitors go to /signin
  useEffect(() => {
    if (!mounted || authLoading) return;
    if (!authUser) {
      router.replace('/signin');
    }
  }, [mounted, authLoading, authUser, router]);

  // Enforce Stage 2 (Activation Gate) & Stage 3 (Auto-unlock to /channels)
  useEffect(() => {
    if (!mounted || authLoading || !authUser) return;

    if (!subscription.isActive && activePage !== 'Profile') {
      router.replace('/profile?locked=1');
    } else if (!prevSubActive.current && subscription.isActive && activePage === 'Profile') {
      setLockNotice(null);
      router.push('/channels');
    }

    prevSubActive.current = subscription.isActive;
  }, [subscription.isActive, authUser, authLoading, mounted, activePage, router]);

  const handleNavigate = (targetLabel: string) => {
    const targetRoute = ROUTE_MAP[targetLabel] || '/profile';

    if (!subscription.isActive && targetLabel !== 'Profile') {
      if (pathname !== '/profile') {
        router.push('/profile?locked=1');
      } else {
        setLockNotice(
          'Please activate your ArenaX Pro plan or apply a Promo Code below to unlock Live TV channels.'
        );
        setTimeout(() => setLockNotice(null), 4000);
      }
      return;
    }

    setLockNotice(null);
    if (pathname !== targetRoute) {
      router.push(targetRoute);
    }
  };

  const user: User | null = authUser
    ? {
        name: profile?.name || authUser.email?.split('@')[0] || 'Mwanachama',
        email: profile?.email || authUser.email || '',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        isPremium: subscription.isActive,
      }
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-main)]">
      <Header
        active={activePage}
        setActive={handleNavigate}
        user={user}
        onLogin={() => router.push('/signin')}
        onSubscribe={() => router.push('/profile')}
        onLogoutClick={() => router.push('/signout')}
      />

      <div className="flex flex-1 min-w-0">
        <Sidebar active={activePage} setActive={handleNavigate} />

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full min-w-0">
          {lockNotice && (
            <div className="max-w-2xl mx-auto w-full p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs animate-fadeIn">
              <Lock size={15} className="shrink-0" />
              <span>{lockNotice}</span>
            </div>
          )}

          <div className="flex-1 flex flex-col gap-6 min-w-0">{children}</div>
        </main>
      </div>

      <MobileNav active={activePage} setActive={handleNavigate} />
    </div>
  );
};

