'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useStream } from '@/context/StreamContext';

export default function SignInPage() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const { subscription } = useStream();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace(subscription.isActive ? '/channels' : '/profile');
    }
  }, [user, subscription.isActive, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) throw signInError;
      router.replace(subscription.isActive ? '/channels' : '/profile');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col text-white selection:bg-[#e50914] selection:text-white"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 0%, rgba(92, 12, 18, 0.85) 0%, rgba(28, 5, 7, 0.95) 55%, #070203 100%)',
      }}
    >
      {/* Top Header */}
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
            href="/signup"
            className="text-xs sm:text-sm font-bold text-white/80 hover:text-white transition-colors"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Main Centered Sign In Form */}
      <main className="flex-1 flex flex-col items-center justify-start pt-12 sm:pt-20 px-5 pb-16">
        <div className="w-full max-w-[440px] flex flex-col">
          <h1 className="text-3xl sm:text-[34px] font-black tracking-tight text-white leading-tight">
            Sign in to ArenaTV
          </h1>

          {error && (
            <div className="mt-5 p-3.5 rounded-md bg-[#e50914]/15 border border-[#e50914]/40 text-red-200 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle size={17} className="shrink-0 text-[#e50914]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-white/90 block mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 sm:h-15 px-5 rounded-lg bg-[#141112]/90 border border-white/25 text-white placeholder-white/40 text-base focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-white/90 block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 sm:h-15 pl-5 pr-14 rounded-lg bg-[#141112]/90 border border-white/25 text-white placeholder-white/40 text-base focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full h-12 sm:h-12.5 rounded-xl bg-[#e50914] hover:bg-red-700 disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In to ArenaTV</span>
              )}
            </button>
          </form>

          {/* Account Assistance */}
          <div className="mt-8 pt-5 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-white/60">Don&apos;t have an account?</span>
              <Link href="/signup" className="text-red-400 font-bold hover:underline">
                Register for ArenaTV
              </Link>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-white/60">Need to return?</span>
              <Link href="/" className="text-white/80 hover:underline">
                Back to Home Page
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

