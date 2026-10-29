'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useStream } from '@/context/StreamContext';

export default function SignOutPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { resetSubscriptionToNewUser } = useStream();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Perform sign out immediately when arriving on /signout
    async function performSignOut() {
      try {
        resetSubscriptionToNewUser();
        await signOut();
      } catch (e) {
        console.warn('Sign out note:', e);
      }
    }
    performSignOut();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col text-white selection:bg-[#e50914] selection:text-white"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 0%, rgba(92, 12, 18, 0.85) 0%, rgba(28, 5, 7, 0.95) 55%, #070203 100%)',
      }}
    >
      {/* Top Header with Subtle Bottom Divider */}
      <header className="w-full border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 sm:px-12 h-20 sm:h-24 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center select-none">
            <img
              src="/Assets/ArenaTV Logo.png"
              alt="ArenaTV"
              className="h-10 sm:h-12 lg:h-14 w-auto object-contain drop-shadow-md"
            />
          </Link>

          <Link
            href="/signin"
            className="px-4 sm:px-5 py-2 rounded-lg bg-[#e50914] hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Centered Sign Out Card (Netflix Style) */}
      <main className="flex-1 flex flex-col items-center justify-start pt-14 sm:pt-24 px-5 pb-16">
        <div className="w-full max-w-[440px] flex flex-col">
          <h1 className="text-3xl sm:text-[34px] font-black tracking-tight text-white leading-tight">
            Leaving So Soon?
          </h1>

          <p className="text-base text-white/80 font-normal mt-3 leading-relaxed">
            You have been securely signed out of your ArenaTV account. Just so you know, you don&apos;t
            always need to sign out of ArenaTV unless you are on a shared or public device.
          </p>

          <p className="text-sm text-white/60 mt-4">
            You&apos;ll be redirected to ArenaTV home in{' '}
            <span className="text-white font-bold">{countdown} seconds</span>.
          </p>

          <button
            type="button"
            onClick={() => router.replace('/')}
            className="mt-6 w-full h-12 sm:h-13 rounded-md bg-[#e50914] hover:bg-red-700 text-white font-bold text-base flex items-center justify-center transition-all cursor-pointer shadow-lg"
          >
            Go Now
          </button>
        </div>
      </main>
    </div>
  );
}

