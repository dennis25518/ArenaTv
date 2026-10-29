'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      router.replace('/profile');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!name.trim()) {
        throw new Error('Please enter your full name.');
      }
      const { error: signUpError } = await signUp(name.trim(), email.trim(), password);
      if (signUpError) throw signUpError;
      router.replace('/profile');
    } catch (err: any) {
      setError(err.message || 'Could not create account. Please try again.');
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
      {/* Top Header with Subtle Bottom Divider (Netflix Auth Style) */}
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
            className="text-sm sm:text-base font-bold text-white/90 hover:text-white hover:underline transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Centered Sign Up Form */}
      <main className="flex-1 flex flex-col items-center justify-start pt-12 sm:pt-20 px-5 pb-16">
        <div className="w-full max-w-[440px] flex flex-col">
          <h1 className="text-3xl sm:text-[34px] font-black tracking-tight text-white leading-tight">
            Create your account to get started
          </h1>
          <p className="text-base sm:text-lg text-white/75 font-normal mt-2">
            Already have an account?{' '}
            <Link href="/signin" className="text-white font-semibold hover:underline">
              Sign in here.
            </Link>
          </p>

          {error && (
            <div className="mt-5 p-3.5 rounded-md bg-[#e50914]/15 border border-[#e50914]/40 text-red-200 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle size={17} className="shrink-0 text-[#e50914]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
            <div>
              <input
                type="text"
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 px-4 rounded-md bg-[#141112]/90 border border-white/25 text-white placeholder-white/60 text-base focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>

            <div>
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 px-4 rounded-md bg-[#141112]/90 border border-white/25 text-white placeholder-white/60 text-base focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Create a password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 pl-4 pr-12 rounded-md bg-[#141112]/90 border border-white/25 text-white placeholder-white/60 text-base focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full h-12 sm:h-13 rounded-md bg-[#e50914] hover:bg-red-700 disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>

          {/* Get Help Accordion (Netflix Style) */}
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:underline cursor-pointer"
            >
              <span>Get Help</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${showHelp ? 'rotate-180' : ''}`}
              />
            </button>

            {showHelp && (
              <div className="mt-3 flex flex-col gap-2 text-sm text-white/70 pl-1 animate-fadeIn">
                <Link href="/signin" className="hover:text-white hover:underline w-fit">
                  Sign in with an existing account
                </Link>
                <Link href="/" className="hover:text-white hover:underline w-fit">
                  Return to ArenaTV home page
                </Link>
              </div>
            )}
          </div>

          <p className="mt-8 text-xs text-white/45 leading-relaxed">
            By continuing, you can activate your ArenaX Pro subscription via Mobile Money (2,000
            TZS/month) or apply a free promo code on your profile.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070203]" />}>
      <SignUpContent />
    </Suspense>
  );
}

