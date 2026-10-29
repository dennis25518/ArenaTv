'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, 
  CheckCircle2, 
  Sparkles, 
  Calendar,
  Clock,
  RotateCcw,
  Loader2,
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  Zap,
  HelpCircle,
  Ticket
} from 'lucide-react';
import { useStream } from '@/context/StreamContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface ProfileViewProps {
  onLogin?: () => void;
  onLogout?: () => void;
  onSubscribe?: () => void;
}

const TANZANIA_PROVIDERS = [
  { id: 'M-Pesa', name: 'M-Pesa', company: 'Vodacom', logo: '/Mobile Networks/Vodacom.png' },
  { id: 'Tigo Pesa', name: 'Tigo Pesa', company: 'Yas', logo: '/Mobile Networks/YAS.jpg' },
  { id: 'Airtel Money', name: 'Airtel Money', company: 'Airtel', logo: '/Mobile Networks/Airtel.jpg' },
  { id: 'HaloPesa', name: 'HaloPesa', company: 'Halotel', logo: '/Mobile Networks/Halotel.jpg' },
];

const getProviderLogo = (providerName: string) => {
  const norm = (providerName || '').toLowerCase();
  if (norm.includes('halo') || norm.includes('halotel')) return '/Mobile Networks/Halotel.jpg';
  if (norm.includes('tigo') || norm.includes('yas')) return '/Mobile Networks/YAS.jpg';
  if (norm.includes('airtel')) return '/Mobile Networks/Airtel.jpg';
  return '/Mobile Networks/Vodacom.png';
};

export const ProfileView: React.FC<ProfileViewProps> = () => {
  const router = useRouter();
  const { user, profile, signUp, signIn, signOut } = useAuth();
  const { 
    subscription, 
    timeRemaining, 
    activateSubscription, 
    cancelSubscription,
    resetSubscriptionToNewUser 
  } = useStream();

  const supabase = createClient();

  // Wire production flow directly to Supabase database for the logged-in user
  useEffect(() => {
    async function syncSubscriptionWithDatabase() {
      if (!user) return;
      try {
        const { data: sub, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub && sub.expires_at) {
          const expiresMs = new Date(sub.expires_at).getTime();
          if (expiresMs > Date.now()) {
            const daysRemaining = Math.max(1, Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000)));
            activateSubscription(
              sub.provider === 'Promo Code' ? 'Admin' : sub.phone || '',
              sub.provider || 'M-Pesa',
              Number(sub.amount) ?? 2000,
              daysRemaining,
              expiresMs
            );
            return;
          }
        }

        // All users who create account land in the unpaid phase by default
        cancelSubscription();
      } catch (err) {
        console.warn('Subscription DB sync note:', err);
      }
    }

    syncSubscriptionWithDatabase();
  }, [user?.id]);

  // Auth Card mode for guests: 'login' | 'register' (default login)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Mobile Money Payment Form State (for logged-in users who haven't paid yet)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ussdPrompt, setUssdPrompt] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  // Promo Code Form State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Repayment form state for active paying customer
  const [isRepaying, setIsRepaying] = useState(false);
  const [repayProvider, setRepayProvider] = useState<string>('HaloPesa');
  const [repayPhone, setRepayPhone] = useState<string>('0754 888 222');
  const [isRepayProcessing, setIsRepayProcessing] = useState(false);
  const [repayUssdPrompt, setRepayUssdPrompt] = useState(false);
  const [repayPaymentMessage, setRepayPaymentMessage] = useState<string | null>(null);

  // Handle Sign Up & Sign In submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'register') {
        if (!authName.trim()) {
          throw new Error('Please enter your full name.');
        }
        const { error } = await signUp(authName.trim(), authEmail.trim(), authPassword);
        if (error) throw error;
      } else {
        const { error } = await signIn(authEmail.trim(), authPassword);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthError(err.message || 'Authentication error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleStartRepay = () => {
    setRepayProvider(subscription.provider || 'HaloPesa');
    setRepayPhone(subscription.phone || '0754 888 222');
    setRepayPaymentMessage(null);
    setRepayUssdPrompt(false);
    setIsRepaying(true);
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayProvider || !repayPhone.trim()) return;
    const currentProvider = repayProvider;
    const currentPhone = repayPhone.trim();

    setIsRepayProcessing(true);
    setRepayPaymentMessage(null);
    setRepayUssdPrompt(true);

    try {
      const res = await fetch('/api/payments/abliner/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          provider: currentProvider,
          amount: 2000,
          userId: user?.id || null,
          userEmail: profile?.email || user?.email || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setRepayPaymentMessage(data.message || 'Hitilafu ya kuanzisha malipo. Tafadhali hakikisha namba yako.');
        setRepayUssdPrompt(false);
        setIsRepayProcessing(false);
        return;
      }

      setRepayPaymentMessage('📱 USSD imetumwa! Weka namba yako ya siri kwenye simu kuthibitisha TZS 2,000...');

      // Poll status every 3 seconds for up to 60 seconds
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const checkRes = await fetch(
            `/api/payments/abliner/status?id=${encodeURIComponent(data.transactionId || '')}&userId=${encodeURIComponent(user?.id || '')}`
          );
          const checkData = await checkRes.json();

          if (checkData.isPaid || checkData.status === 'completed' || checkData.status === 'successful') {
            clearInterval(interval);
            activateSubscription(currentPhone, currentProvider, 2000, 30);
            setRepayPaymentMessage('Hongera! Malipo yamekamilika na kifurushi kimewashwa!');
            setRepayUssdPrompt(false);
            setIsRepayProcessing(false);
            setTimeout(() => {
              setIsRepaying(false);
              setRepayPaymentMessage(null);
            }, 2000);
          } else if (attempts >= 20) {
            clearInterval(interval);
            setRepayPaymentMessage('Muda umekwisha au muamala bado unachakatwa. Ukikamilika kifurushi kitaanza kiotomatiki.');
            setRepayUssdPrompt(false);
            setIsRepayProcessing(false);
          }
        } catch {
          if (attempts >= 20) {
            clearInterval(interval);
            setRepayUssdPrompt(false);
            setIsRepayProcessing(false);
          }
        }
      }, 3000);
    } catch (err) {
      setRepayPaymentMessage('Hitilafu ya mtandao. Tafadhali jaribu tena.');
      setRepayUssdPrompt(false);
      setIsRepayProcessing(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) {
      setPaymentMessage('Tafadhali chagua mtandao wako kwanza.');
      return;
    }
    if (!phoneNumber.trim()) {
      setPaymentMessage('Tafadhali ingiza namba ya simu ya kulipia.');
      return;
    }

    const currentProvider = selectedProvider;
    const currentPhone = phoneNumber.trim();

    setIsProcessing(true);
    setPaymentMessage(null);
    setUssdPrompt(true);

    try {
      const res = await fetch('/api/payments/abliner/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          provider: currentProvider,
          amount: 2000,
          userId: user?.id || null,
          userEmail: profile?.email || user?.email || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPaymentMessage(data.message || 'Hitilafu ya kuanzisha malipo. Tafadhali hakikisha namba yako.');
        setUssdPrompt(false);
        setIsProcessing(false);
        return;
      }

      setPaymentMessage('📱 USSD imetumwa! Weka namba yako ya siri kwenye simu kuthibitisha TZS 2,000...');

      // Poll status every 3 seconds for up to 60 seconds
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const checkRes = await fetch(
            `/api/payments/abliner/status?id=${encodeURIComponent(data.transactionId || '')}&userId=${encodeURIComponent(user?.id || '')}`
          );
          const checkData = await checkRes.json();

          if (checkData.isPaid || checkData.status === 'completed' || checkData.status === 'successful') {
            clearInterval(interval);
            activateSubscription(currentPhone, currentProvider, 2000, 30);
            setPaymentMessage('Hongera! Malipo yamekamilika na kifurushi kimewashwa!');
            setUssdPrompt(false);
            setIsProcessing(false);
          } else if (attempts >= 20) {
            clearInterval(interval);
            setPaymentMessage('Muda umekwisha au muamala bado unachakatwa. Ukikamilika kifurushi kitaanza kiotomatiki.');
            setUssdPrompt(false);
            setIsProcessing(false);
          }
        } catch {
          if (attempts >= 20) {
            clearInterval(interval);
            setUssdPrompt(false);
            setIsProcessing(false);
          }
        }
      }, 3000);
    } catch (err) {
      setPaymentMessage('Hitilafu ya mtandao. Tafadhali jaribu tena.');
      setUssdPrompt(false);
      setIsProcessing(false);
    }
  };

  const handleApplyPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setPromoFeedback({ type: 'error', message: 'Please enter a promo code.' });
      return;
    }

    setIsApplyingPromo(true);
    setPromoFeedback(null);

    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          userId: user?.id || null,
          userEmail: profile?.email || user?.email || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const expiresAtMs = data.expires_at
          ? new Date(data.expires_at).getTime()
          : Date.now() + (Number(data.duration_minutes) || 30) * 60 * 1000;

        setPromoFeedback({
          type: 'success',
          message: data.message || 'Promo code applied! Unlocking live streams...',
        });
        setPromoCodeInput('');

        setTimeout(() => {
          activateSubscription(
            'Admin',
            'Promo Code',
            0,
            1,
            expiresAtMs
          );
        }, 600);
        return;
      }

      // Fallback check in localStorage if SQL migration hasn't been run in Supabase yet
      if (data.notFoundInDb && typeof window !== 'undefined') {
        const localSaved = localStorage.getItem('arenax_admin_promo_codes');
        if (localSaved) {
          const parsedPromos = JSON.parse(localSaved) as any[];
          const matched = parsedPromos.find(
            (p) => String(p.code).toUpperCase() === cleanCode && p.is_active !== false
          );
          if (matched) {
            const promoExpMs = new Date(matched.expires_at).getTime();
            if (promoExpMs <= Date.now()) {
              setPromoFeedback({ type: 'error', message: 'This promo code has expired.' });
              return;
            }
            if ((matched.used_count || 0) >= (matched.max_uses || 100)) {
              setPromoFeedback({
                type: 'error',
                message: 'This promo code has reached its usage limit.',
              });
              return;
            }
            const durationMinutes = Math.min(
              1440,
              Math.max(1, Number(matched.duration_minutes) || 30)
            );
            const subExpiresAtMs = Date.now() + durationMinutes * 60 * 1000;

            matched.used_count = (matched.used_count || 0) + 1;
            localStorage.setItem('arenax_admin_promo_codes', JSON.stringify(parsedPromos));

            if (user) {
              try {
                await supabase.from('subscriptions').insert({
                  user_id: user.id,
                  plan_name: `ArenaX Promo (${cleanCode})`,
                  provider: 'Promo Code',
                  phone: 'Admin',
                  amount: 0,
                  status: 'active',
                  activated_at: new Date().toISOString(),
                  expires_at: new Date(subExpiresAtMs).toISOString(),
                });
              } catch {}
            }

            setPromoFeedback({
              type: 'success',
              message: `Promo code ${cleanCode} applied! Free access activated.`,
            });
            setPromoCodeInput('');
            setTimeout(() => {
              activateSubscription(
                'Admin',
                'Promo Code',
                0,
                1,
                subExpiresAtMs
              );
            }, 600);
            return;
          }
        }
      }

      setPromoFeedback({
        type: 'error',
        message: data.message || 'Invalid or expired promo code.',
      });
    } catch (err) {
      setPromoFeedback({
        type: 'error',
        message: 'Network error while verifying promo code. Please try again.',
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 sm:py-6 px-2 sm:px-4">
      <div className="w-full max-w-2xl flex flex-col gap-4 sm:gap-5">
        
        {/* ========================================================= */}
        {/* FLOW 1: FIRST-TIME USER (NOT LOGGED IN / GUEST)           */}
        {/* ========================================================= */}
        {!user ? (
          <section className="w-full max-w-md mx-auto rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-xl flex flex-col gap-6 text-left transition-all">
            
            {/* Header: Welcome Back / Create Account */}
            <div className="flex flex-col items-center text-center gap-2 pt-1">
              <h2 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                {authMode === 'login' 
                  ? 'Sign in to access your live channels and account' 
                  : 'Sign up to start streaming ArenaTV live'}
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Auth Form (In English) */}
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              {authMode === 'register' && (
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[#1a1a24] border border-[var(--color-border-main)] text-sm text-[var(--color-text-primary)] placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[#1a1a24] border border-[var(--color-border-main)] text-sm text-[var(--color-text-primary)] placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter your password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 dark:bg-[#1a1a24] border border-[var(--color-border-main)] text-sm text-[var(--color-text-primary)] placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="mt-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {authLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Please wait...</span>
                  </>
                ) : authMode === 'login' ? (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Switch between Sign In and Sign Up */}
            <div className="text-center pt-2 border-t border-[var(--color-border-main)]">
              {authMode === 'login' ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError(null);
                    }}
                    className="font-bold text-red-600 hover:text-red-500 hover:underline cursor-pointer transition-colors"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                    }}
                    className="font-bold text-red-600 hover:text-red-500 hover:underline cursor-pointer transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>

          </section>
        ) : (

          /* ========================================================= */
          /* FLOW 2: LOGGED-IN USER (PROCEED TO PLAN & SUBSCRIPTION)   */
          /* ========================================================= */
          <>
            {/* ========================================================= */}
            {/* CARD 1: TOP USER INFO CARD                                */}
            {/* ========================================================= */}
            <section className="w-full rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left transition-all">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 min-w-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-red-500/20 shadow-xs shrink-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                  {/* Hardcoded Avatar per user request */}
                  <img 
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover" 
                  />
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-[var(--color-text-primary)] tracking-tight truncate">
                      {profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                    </h2>
                    <CheckCircle2 size={16} className="text-red-600 shrink-0" fill="currentColor" color="white" />
                  </div>
                  
                  <p className="text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] truncate mt-0.5">
                    {profile?.email || user.email}
                  </p>

                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-2">
                    <Calendar size={13} className="text-gray-400" />
                    <span>Joined October 2026</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================================= */}
            {/* CARD 2: ARENAX PRO PLAN CARD                             */}
            {/* ========================================================= */}
            <section className="w-full rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-sm flex flex-col gap-5 text-left transition-all">
              
              {/* Plan Header */}
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--color-border-main)]">
                <h3 className="text-lg sm:text-xl font-black text-[var(--color-text-primary)] tracking-tight">
                  ArenaX Pro
                </h3>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-red-600">
                    2,000
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase">
                    TZS / MONTH
                  </span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* STATE A: UNPAID USER (HOW TO PAY & SELECT NETWORK)       */}
              {/* ========================================================= */}
              {!subscription.isActive ? (
                <div className="flex flex-col gap-5">
                  
                  {/* How-To-Pay Visual Guide */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 via-amber-500/5 to-transparent border border-red-500/20 flex flex-col gap-3">
                    <span className="text-xs font-black text-red-600 dark:text-red-500 uppercase tracking-wider">
                      HOW TO PAY
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a24] border border-[var(--color-border-main)] flex items-center gap-2.5 shadow-2xs">
                        <div className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          1
                        </div>
                        <span className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">
                          Choose network
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a24] border border-[var(--color-border-main)] flex items-center gap-2.5 shadow-2xs">
                        <div className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          2
                        </div>
                        <span className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">
                          Enter your contacts
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a24] border border-[var(--color-border-main)] flex items-center gap-2.5 shadow-2xs">
                        <div className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          3
                        </div>
                        <span className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">
                          Verify Pin
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Select Network */}
                  <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-wide">
                        Choose Your Network:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {TANZANIA_PROVIDERS.map((prov) => {
                          const isSelected = selectedProvider === prov.id;
                          return (
                            <button
                              type="button"
                              key={prov.id}
                              onClick={() => {
                                setSelectedProvider(prov.id);
                                setPaymentMessage(null);
                              }}
                              className={`h-16 sm:h-20 p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center select-none bg-white dark:bg-[#1a1a24] shadow-2xs ${
                                isSelected
                                  ? 'border-red-600 bg-red-500/10 shadow-md ring-2 ring-red-600/30 scale-[1.02]'
                                  : 'border-[var(--color-border-main)] hover:border-gray-400 dark:hover:border-gray-600 opacity-80 hover:opacity-100 hover:scale-[1.01]'
                              }`}
                              title={prov.name}
                            >
                              <img
                                src={prov.logo}
                                alt={prov.name}
                                className="h-full w-full object-contain rounded-lg"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Enter Contacts (Appears once network selected) */}
                    {selectedProvider ? (
                      <div className="flex flex-col gap-3 animate-fadeIn">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-wide flex items-center gap-1.5">
                            <span>Enter Your Contacts</span>
                            <span className="text-[11px] font-bold text-red-600 dark:text-red-500 normal-case">
                              ({selectedProvider})
                            </span>
                          </label>
                          <div className="flex items-center rounded-xl border border-[var(--color-border-main)] bg-white dark:bg-[#1a1a24] focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-100 dark:focus-within:ring-red-900/30 transition-all overflow-hidden">
                            <div className="px-3.5 py-2.5 bg-black/5 dark:bg-white/5 border-r border-[var(--color-border-main)] text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 select-none shrink-0">
                              <span>🇹🇿</span>
                              <span>+255</span>
                            </div>
                            <input
                              type="tel"
                              required
                              autoFocus
                              placeholder="0754 888 222"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="w-full px-3 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] outline-none bg-transparent"
                            />
                          </div>
                          <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">
                            The system will send a USSD (STK push) prompt directly to your phone to confirm TZS 2,000.
                          </span>
                        </div>

                        {/* USSD Prompt Feedback */}
                        {ussdPrompt && (
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 font-bold flex items-center gap-2.5 animate-pulse">
                            <Loader2 size={16} className="text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                            <span>📱 Check your phone now! Enter your PIN to confirm payment of TZS 2,000...</span>
                          </div>
                        )}

                        {/* Status Message */}
                        {paymentMessage && (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{paymentMessage}</span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1 w-full">
                          <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-black text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-99"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <Zap size={18} fill="currentColor" />
                                <span>Pay Now</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => {
                              setSelectedProvider(null);
                              setPhoneNumber('');
                              setPaymentMessage(null);
                            }}
                            className="w-full py-3.5 px-4 rounded-xl bg-white dark:bg-[#121218] border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-black text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-99"
                          >
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--color-border-main)] text-center text-xs text-[var(--color-text-secondary)] font-medium">
                        Select your mobile network above to continue
                      </div>
                    )}
                  </form>

                  {/* Promo Code Section (Right below Choose Your Network) */}
                  <div className="pt-3 border-t border-[var(--color-border-main)] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-wide flex items-center gap-1.5">
                        <Ticket size={14} className="text-red-600" />
                        <span>Have a Promo Code?</span>
                      </label>
                      <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                        Redeem free trial access
                      </span>
                    </div>

                    <form onSubmit={handleApplyPromoCode} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Enter code (e.g. VIPFREE-8K2M)"
                          value={promoCodeInput}
                          onChange={(e) => {
                            setPromoCodeInput(e.target.value.toUpperCase());
                            if (promoFeedback) setPromoFeedback(null);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#1a1a24] border border-[var(--color-border-main)] text-xs sm:text-sm font-mono font-bold uppercase text-[var(--color-text-primary)] placeholder:font-sans placeholder:font-normal placeholder-gray-400 focus:outline-none focus:border-red-600 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isApplyingPromo || !promoCodeInput.trim()}
                        className="px-4 sm:px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                      >
                        {isApplyingPromo ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Checking...</span>
                          </>
                        ) : (
                          <span>Apply</span>
                        )}
                      </button>
                    </form>

                    {promoFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                          promoFeedback.type === 'success'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {promoFeedback.type === 'success' ? (
                          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle size={15} className="shrink-0 text-red-600" />
                        )}
                        <span>{promoFeedback.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ========================================================= */
                /* VIEW B: ALREADY PAYING CUSTOMER (LIVE 30-DAY COUNTDOWN)   */
                /* ========================================================= */
                <div className="flex flex-col gap-4">
                  {/* Countdown Display Box */}
                  <div className="p-4 rounded-xl bg-gray-50/90 dark:bg-[#1a1a24] border border-[var(--color-border-main)] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={15} className="text-red-600" />
                        <span className="text-xs font-black uppercase tracking-wide text-[var(--color-text-primary)]">
                          PLAN STATUS
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/80 dark:bg-emerald-950/80 dark:text-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        ACTIVE
                      </span>
                    </div>

                    {/* Live Ticking Countdown Units */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-2xs">
                        <span className="block text-lg sm:text-2xl font-black text-red-600">
                          {timeRemaining.days}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Siku</span>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-2xs">
                        <span className="block text-lg sm:text-2xl font-black text-[var(--color-text-primary)]">
                          {timeRemaining.hours}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Saa</span>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-2xs">
                        <span className="block text-lg sm:text-2xl font-black text-[var(--color-text-primary)]">
                          {timeRemaining.minutes}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Dakika</span>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-2xs">
                        <span className="block text-lg sm:text-2xl font-black text-[var(--color-text-primary)]">
                          {timeRemaining.seconds}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Sekunde</span>
                      </div>
                    </div>

                    {/* Meta details */}
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-main)] text-xs">
                      <div className="flex items-center gap-2">
                        {subscription.provider === 'Promo Code' ? (
                          <div className="w-5 h-5 rounded bg-red-600/10 text-red-600 flex items-center justify-center">
                            <Ticket size={13} />
                          </div>
                        ) : (
                          <img 
                            src={getProviderLogo(subscription.provider || 'Vodacom')} 
                            alt={subscription.provider || 'Provider'} 
                            className="w-5 h-5 rounded object-contain" 
                          />
                        )}
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {subscription.provider || 'M-Pesa'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                        {subscription.provider === 'Promo Code' ? 'Activated Via:' : 'Paid By:'}{' '}
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {subscription.provider === 'Promo Code'
                            ? 'Admin'
                            : subscription.phone || '0754 888 222'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* REPAY ACTION */}
                  {!isRepaying ? (
                    <button
                      type="button"
                      onClick={handleStartRepay}
                      className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-99"
                    >
                      <Zap size={16} fill="currentColor" />
                      <span>REPAY NOW</span>
                    </button>
                  ) : (
                    <form onSubmit={handleRepaySubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-red-600 uppercase tracking-wide">
                          Extend Subscription (TZS 2,000)
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsRepaying(false)}
                          className="text-xs text-gray-500 hover:text-red-600 font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex items-center rounded-xl border border-[var(--color-border-main)] bg-white dark:bg-[#1a1a24] overflow-hidden">
                        <div className="px-3 py-2 bg-black/5 dark:bg-white/5 border-r border-[var(--color-border-main)] text-xs font-bold">
                          +255
                        </div>
                        <input
                          type="tel"
                          required
                          value={repayPhone}
                          onChange={(e) => setRepayPhone(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold outline-none bg-transparent"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isRepayProcessing}
                        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isRepayProcessing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="currentColor" />}
                        <span>Confirm & Pay TZS 2,000</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </section>

            {/* ========================================================= */}
            {/* CARD 3: BOTTOM SIGN OUT CARD                              */}
            {/* ========================================================= */}
            <section className="w-full rounded-2xl p-4 sm:p-6 bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-sm flex flex-row items-center justify-between gap-3 text-left transition-all">
              <div className="flex flex-col min-w-0">
                <h3 className="text-base sm:text-xl font-black text-[var(--color-text-primary)] truncate">
                  Wanna Leave ?
                </h3>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => router.push('/signout')}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                >
                  <LogOut size={16} />
                  <span>SignOut</span>
                </button>
              </div>
            </section>
          </>
        )}

      </div>
    </div>
  );
};