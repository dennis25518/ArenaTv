'use client';

import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Shield, 
  CheckCircle2, 
  Sparkles, 
  Check, 
  ChevronRight, 
  LogOut, 
  LogIn, 
  Calendar,
  Smartphone,
  Clock,
  RotateCcw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Zap,
  Lock,
  Tv
} from 'lucide-react';
import { User as UserType } from '@/types';
import { useStream } from '@/context/StreamContext';

interface ProfileViewProps {
  user: UserType | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onSubscribe?: () => void;
  paymentMethods?: any[];
  onAddPayment?: (m: any) => void;
  onDeletePayment?: (id: string) => void;
  onEditPayment?: (m: any) => void;
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

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onLogin,
  onLogout,
}) => {
  const { 
    subscription, 
    timeRemaining, 
    activateSubscription, 
    cancelSubscription,
    resetSubscriptionToNewUser 
  } = useStream();

  // Mode view state: defaults to new_user for first-time visitors, allows switching between both views
  const [activePlanView, setActivePlanView] = useState<'new_user' | 'paid_customer'>('new_user');

  // Sync mode with subscription status
  useEffect(() => {
    setActivePlanView(subscription.isActive ? 'paid_customer' : 'new_user');
  }, [subscription.isActive]);

  // Mobile Money Payment Form State: initially null so number section is hidden until network is selected
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ussdPrompt, setUssdPrompt] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  // Repayment form state for active paying customer (verify/edit info before paying again)
  const [isRepaying, setIsRepaying] = useState(false);
  const [repayProvider, setRepayProvider] = useState<string>('HaloPesa');
  const [repayPhone, setRepayPhone] = useState<string>('0754 888 222');
  const [isRepayProcessing, setIsRepayProcessing] = useState(false);
  const [repayUssdPrompt, setRepayUssdPrompt] = useState(false);
  const [repayPaymentMessage, setRepayPaymentMessage] = useState<string | null>(null);

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
      const res = await fetch('/api/payment/mobile-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          provider: currentProvider,
          amount: 2000,
        }),
      });

      const data = await res.json();

      setTimeout(() => {
        if (data.success) {
          activateSubscription(currentPhone, currentProvider, 2000, 30);
          setRepayPaymentMessage(data.message || 'Malipo yamekamilika! Kifurushi chako kimeongezwa.');
          setRepayUssdPrompt(false);
          setIsRepayProcessing(false);
          setTimeout(() => {
            setIsRepaying(false);
            setRepayPaymentMessage(null);
          }, 2000);
        } else {
          setRepayPaymentMessage(data.message || 'Hitilafu ya malipo.');
          setRepayUssdPrompt(false);
          setIsRepayProcessing(false);
        }
      }, 1500);
    } catch (err) {
      setRepayPaymentMessage('Hitilafu ya mtandao. Tafadhali jaribu tena.');
      setRepayUssdPrompt(false);
      setIsRepayProcessing(false);
    }
  };


  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !phoneNumber.trim()) return;
    const currentProvider = selectedProvider;

    setIsProcessing(true);
    setPaymentMessage(null);
    setUssdPrompt(true);

    try {
      // Call Tanzanian Mobile Money Payment API
      const res = await fetch('/api/payment/mobile-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          provider: currentProvider,
          amount: 2000,
        }),
      });

      const data = await res.json();

      // Simulated USSD confirmation delay (1.5 seconds)
      setTimeout(() => {
        if (data.success) {
          activateSubscription(phoneNumber.trim(), currentProvider, 2000, 30);
          setActivePlanView('paid_customer');
          setPaymentMessage(data.message);
          setUssdPrompt(false);
          setIsProcessing(false);
        } else {
          setPaymentMessage(data.message || 'Hitilafu ya malipo.');
          setUssdPrompt(false);
          setIsProcessing(false);
        }
      }, 1500);
    } catch (err) {
      setPaymentMessage('Hitilafu ya mtandao. Tafadhali jaribu tena.');
      setUssdPrompt(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 sm:py-6 px-2 sm:px-4">
      <div className="w-full max-w-2xl flex flex-col gap-4 sm:gap-5">
        
        {/* ========================================================= */}
        {/* CARD 1: TOP USER INFO CARD                                */}
        {/* ========================================================= */}
        <section className="w-full rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left transition-all">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-red-500/20 shadow-xs shrink-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
                  <UserIcon size={32} />
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[var(--color-text-primary)] tracking-tight truncate">
                  {user ? user.name : 'Mtumiaji Mpya (Guest)'}
                </h2>
                <CheckCircle2 size={16} className="text-red-600 shrink-0" fill="currentColor" color="white" />
              </div>
              
              <p className="text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] truncate mt-0.5">
                {user ? user.email : 'welcome@arenax.tv'}
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-2">
                <Calendar size={13} className="text-gray-400" />
                <span>Joined October 2026</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* CARD 2: TANZANIAN PLAN CARD                               */}
        {/* ========================================================= */}
        <section className="w-full rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-sm flex flex-col gap-5 text-left transition-all">
          
          {/* Plan Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 border border-red-100 dark:border-red-900/50 shadow-xs shrink-0">
                <Smartphone size={22} className="text-red-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[var(--color-text-primary)] tracking-tight">
                ArenaX Pro
              </h3>
            </div>

            <div className="flex items-center">
              <span className="text-xl sm:text-2xl font-black text-red-600">
                2,000 <span className="text-xs text-gray-500 font-bold uppercase">TZS / Month</span>
              </span>
            </div>
          </div>

          {/* Interactive Mode Switcher Segmented Pills */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-1.5 rounded-xl bg-gray-100 dark:bg-[#1a1a24] border border-[var(--color-border-main)]">
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)] px-2 self-start sm:self-center">
              Badili Muonekano (Switch View):
            </span>
            <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActivePlanView('new_user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                  activePlanView === 'new_user'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Sparkles size={13} />
                <span>Mtumiaji Mpya</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!subscription.isActive) {
                    activateSubscription('0754 888 222', 'M-Pesa', 2000, 30);
                  }
                  setActivePlanView('paid_customer');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                  activePlanView === 'paid_customer'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Clock size={13} />
                <span>Mteja Aliyelipia</span>
              </button>
            </div>
          </div>

          <hr className="border-t border-[var(--color-border-main)] my-0.5" />

          {/* ========================================================= */}
          {/* VIEW A: FIRST-TIME USER INTERFACE (GUIDE & PAYMENT)       */}
          {/* ========================================================= */}
          {activePlanView === 'new_user' ? (
            <div className="flex flex-col gap-5">
              
              {/* How-To-Pay Visual Guide */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 via-amber-500/5 to-transparent border border-red-500/20 flex flex-col gap-3">
                <span className="text-xs font-black text-red-600 dark:text-red-500 uppercase tracking-wider">
                  HOW TO PAY
                </span>

                {/* 3 Step Visual Flow */}
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

              {/* Interactive Tanzanian Payment Form */}
              <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4 pt-1">
                {/* 1. Network Provider Selector (Images only) */}
                <div className="flex flex-col gap-2">
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

                {/* 2. Phone Number & Submit Section (Revealed when network is selected) */}
                {selectedProvider ? (
                  <div className="flex flex-col gap-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
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
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-3 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] outline-none bg-transparent"
                        />
                      </div>
                      <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">
                        The system will send a USSD (STK push) prompt directly to your phone to confirm TZS 2,000.
                      </span>
                    </div>

                    {/* USSD Prompt Simulation Feedback */}
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

                    {/* Action Buttons: Pay Now (Left) & Cancel (Right) of Equal Size */}
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
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--color-border-main)] text-center text-xs text-[var(--color-text-secondary)] font-medium">
                    Select your mobile network above to continue
                  </div>
                )}
              </form>
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

                {/* Details: Left (Network Logo & Name) & Right (Paid By: 0754 888 222) */}
                <div className="flex items-center justify-between text-xs pt-1">
                  {/* Left: Squircle network image & provider name */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg overflow-hidden border border-[var(--color-border-main)] bg-white p-0.5 flex items-center justify-center shrink-0 shadow-2xs">
                      <img 
                        src={getProviderLogo(subscription.provider || 'HaloPesa')} 
                        alt={subscription.provider || 'Network'} 
                        className="w-full h-full object-contain rounded-md" 
                      />
                    </div>
                    <strong className="text-xs font-bold text-[var(--color-text-primary)]">
                      {subscription.provider || 'HaloPesa'}
                    </strong>
                  </div>

                  {/* Right: Paid By: 0754 888 222 */}
                  <div className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                    <span>Paid By: </span>
                    <strong className="text-xs font-bold text-[var(--color-text-primary)]">
                      {subscription.phone || '0754 888 222'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action: REPAY NOW or Verify/Edit Repayment Details */}
              {!isRepaying ? (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleStartRepay}
                    className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-99"
                  >
                    <Zap size={16} fill="currentColor" />
                    <span>REPAY NOW</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRepaySubmit} className="flex flex-col gap-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* 1. Prefilled Network Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-wide">
                      Choose Your Network:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {TANZANIA_PROVIDERS.map((prov) => {
                        const isSelected = repayProvider === prov.id;
                        return (
                          <button
                            type="button"
                            key={prov.id}
                            onClick={() => {
                              setRepayProvider(prov.id);
                              setRepayPaymentMessage(null);
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

                  {/* 2. Prefilled Contact Info */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-wide flex items-center gap-1.5">
                      <span>Enter Your Contacts</span>
                      <span className="text-[11px] font-bold text-red-600 dark:text-red-500 normal-case">
                        ({repayProvider})
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
                        value={repayPhone}
                        onChange={(e) => setRepayPhone(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] outline-none bg-transparent"
                      />
                    </div>
                    <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">
                      The system will send a USSD (STK push) prompt directly to your phone to confirm TZS 2,000.
                    </span>
                  </div>

                  {/* USSD Prompt Simulation Feedback */}
                  {repayUssdPrompt && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 font-bold flex items-center gap-2.5 animate-pulse">
                      <Loader2 size={16} className="text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                      <span>📱 Check your phone now! Enter your PIN to confirm payment of TZS 2,000...</span>
                    </div>
                  )}

                  {/* Status Message */}
                  {repayPaymentMessage && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{repayPaymentMessage}</span>
                    </div>
                  )}

                  {/* Action Buttons: Pay Now (Left) & Cancel (Right) of Equal Size */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1 w-full">
                    <button
                      type="submit"
                      disabled={isRepayProcessing}
                      className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-black text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-99"
                    >
                      {isRepayProcessing ? (
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
                      disabled={isRepayProcessing}
                      onClick={() => setIsRepaying(false)}
                      className="w-full py-3.5 px-4 rounded-xl bg-white dark:bg-[#121218] border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-black text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-99"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
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
            <h3 className="text-sm sm:text-lg font-black text-[var(--color-text-primary)] truncate">
              Wanna Leave ?
            </h3>
          </div>

          <div className="shrink-0">
            {user ? (
              <button
                type="button"
                onClick={onLogout}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
              >
                <LogOut size={15} />
                <span>SignOut</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};