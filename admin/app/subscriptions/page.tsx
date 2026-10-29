'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Search,
  Ticket,
  Users,
  CheckCircle2,
  Wallet,
  ChevronDown,
  Copy,
  Check,
  Trash2,
  Sparkles,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  applicable_plan: string;
  duration_minutes?: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at?: string | null;
}

const STORAGE_KEY = 'arenax_admin_promo_codes';

const formatDurationBadge = (minutes?: number) => {
  if (!minutes) return '30m';
  if (minutes === 5) return '5 Min';
  if (minutes === 30) return '30 Min';
  if (minutes === 60) return '1 Hour';
  if (minutes === 360) return '6 Hours';
  if (minutes === 1440) return '24 Hours';
  if (minutes < 60) return `${minutes} Min`;
  return `${Math.round(minutes / 60)} Hours`;
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');

  // Create Promo Modal state
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_percent: 100,
    applicable_plan: 'All Plans',
    max_uses: 1000,
    durationMinutes: 1440, // Default 24 Hours
    campaignDays: 0, // 0 = Never Expire / Live Forever
  });

  const supabase = createClient();

  const fetchSubscriptionsAndPromos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSubscriptions(data);
      }

      // Try fetching promo_codes from Supabase, fallback to localStorage if table doesn't exist yet
      const { data: promosData, error: promosError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!promosError && promosData) {
        setPromoCodes(promosData);
      } else if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setPromoCodes(JSON.parse(saved));
        }
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionsAndPromos();
  }, []);

  const savePromosToLocal = (updated: PromoCode[]) => {
    setPromoCodes(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const generateRandomCode = async (discount: number) => {
    try {
      const res = await fetch(`/api/promo/generate?discount=${discount}`);
      const data = await res.json();
      if (data?.success && data?.code) {
        setPromoForm((prev) => ({ ...prev, code: data.code }));
        return;
      }
    } catch {
      // Fallback if offline
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const prefix = discount === 100 ? 'VIPFREE' : `ARENA${discount}`;
    setPromoForm((prev) => ({ ...prev, code: `${prefix}-${suffix}` }));
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code.trim()) return;

    setSavingPromo(true);
    try {
      const res = await fetch('/api/promo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoForm.code.trim().toUpperCase(),
          discount_percent: Number(promoForm.discount_percent),
          applicable_plan: promoForm.applicable_plan,
          max_uses: Number(promoForm.max_uses),
          duration_minutes: Number(promoForm.durationMinutes),
          campaign_days: Number(promoForm.campaignDays) > 0 ? Number(promoForm.campaignDays) : null,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to generate promo code');
      }

      const createdPromo: PromoCode = result.promo;
      const updatedList = [
        createdPromo,
        ...promoCodes.filter((p) => p.code !== createdPromo.code),
      ];
      savePromosToLocal(updatedList);

      setShowPromoModal(false);
      setPromoForm({
        code: '',
        discount_percent: 100,
        applicable_plan: 'All Plans',
        max_uses: 1000,
        durationMinutes: 1440,
        campaignDays: 0,
      });
    } catch (err: any) {
      alert('Failed to create promo code: ' + err.message);
    } finally {
      setSavingPromo(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    const updated = promoCodes.filter((p) => p.id !== id);
    savePromosToLocal(updated);
    await supabase.from('promo_codes').delete().eq('id', id);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 1800);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setSubscriptions(
        subscriptions.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // KPI metrics
  const totalSubscriptions = subscriptions.length;
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === 'active' && (!s.expires_at || new Date(s.expires_at) >= new Date())
  ).length;
  const totalRevenue = subscriptions.reduce(
    (acc, curr) => acc + (Number(curr.amount) || 0),
    0
  );
  const activePromoCount = promoCodes.filter((p) => p.is_active).length;

  // Filtered subscriptions
  const filtered = subscriptions.filter((s) => {
    const matchesSearch =
      (s.phone && s.phone.toLowerCase().includes(search.toLowerCase())) ||
      (s.plan_name && s.plan_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.provider && s.provider.toLowerCase().includes(search.toLowerCase()));

    const matchesProvider =
      selectedProvider === 'ALL' || s.provider === selectedProvider;

    return matchesSearch && matchesProvider;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Subscriptions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage subscriber plans, mobile money payments, and promotional discount codes.
          </p>
        </div>

        <button
          onClick={() => setShowPromoModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e50914] hover:bg-red-700 text-white font-semibold text-sm shadow-sm transition-all"
        >
          <Ticket className="w-4 h-4" />
          Create Promo
        </button>
      </div>

      {/* 2. Top KPI Cards (White cards with neutral grey icons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* All Subscriptions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              All Subscriptions
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {loading ? '...' : totalSubscriptions}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Total recorded plans</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Plans
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {loading ? '...' : activeSubscriptions}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Active subscribers</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Revenue
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {loading ? '...' : `${totalRevenue.toLocaleString()} TZS`}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Mobile money collections</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Active Promo Codes */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Promos
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {loading ? '...' : activePromoCount}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Discount codes</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Active Promo Codes Strip (if any promo codes exist) */}
      {promoCodes.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-red-600" />
              Active Promo Codes
            </h2>
            <span className="text-xs text-slate-400">{promoCodes.length} created</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {promoCodes.map((promo) => {
              const isCopied = copiedCodeId === promo.id;
              const isFree = promo.discount_percent === 100;
              const isExpired = promo.expires_at ? new Date(promo.expires_at) <= new Date() : false;
              return (
                <div
                  key={promo.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900 tracking-wide">
                        {promo.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isFree
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        {promo.discount_percent}% OFF
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 text-slate-700">
                        {formatDurationBadge(promo.duration_minutes)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                      Used: {promo.used_count || 0}/{promo.max_uses} •{' '}
                      {!promo.expires_at ? (
                        <span className="text-emerald-600 font-semibold">♾️ Never (Live Forever)</span>
                      ) : isExpired ? (
                        <span className="text-red-600 font-semibold">Expired</span>
                      ) : (
                        <>
                          Expires{' '}
                          {new Date(promo.expires_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(promo.id, promo.code)}
                      title="Copy Promo Code"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePromo(promo.id)}
                      title="Delete Promo Code"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by phone number or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl pl-3.5 pr-9 py-2.5 focus:outline-none focus:border-red-600 cursor-pointer transition-colors"
          >
            <option value="ALL">All Providers</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="Tigo Pesa">Tigo Pesa</option>
            <option value="Airtel Money">Airtel Money</option>
            <option value="HaloPesa">HaloPesa</option>
            <option value="Promo Code">Promo Code</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 5. Subscriptions Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">No subscriptions recorded yet</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50/60">
                <tr>
                  <th className="py-3.5 px-5">Phone Number</th>
                  <th className="py-3.5 px-4">Plan Name</th>
                  <th className="py-3.5 px-4">Provider</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Expires At</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const isExpired = new Date(s.expires_at) < new Date();
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                        {s.phone || 'Anonymous'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{s.plan_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200/80 text-slate-700">
                          {s.provider}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {Number(s.amount).toLocaleString()} TZS
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            s.status === 'active' && !isExpired
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === 'active' && !isExpired ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {isExpired ? 'EXPIRED' : s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                        {new Date(s.expires_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {s.status === 'active' ? (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'cancelled')}
                            className="text-xs text-red-600 hover:text-red-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'active')}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Create Promo Code Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Promo Code</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate discount or 100% free VIP access codes for subscribers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPromoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="flex flex-col gap-4">
              {/* Discount Percentage Selector (Quick Presets + Input) */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Discount Percentage *
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2.5">
                  {[
                    { label: '25% OFF', value: 25 },
                    { label: '50% OFF', value: 50 },
                    { label: '100% OFF (Free)', value: 100 },
                  ].map((preset) => {
                    const isSelected = Number(promoForm.discount_percent) === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() =>
                          setPromoForm({ ...promoForm, discount_percent: preset.value })
                        }
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-red-50 text-red-600 border-red-200 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={promoForm.discount_percent}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        discount_percent: Math.min(100, Math.max(1, Number(e.target.value))),
                      })
                    }
                    className="w-full px-3.5 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                  <span className="text-xs font-bold text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2">
                    %
                  </span>
                </div>
              </div>

              {/* Promo Code String */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">Promo Code *</label>
                  <button
                    type="button"
                    onClick={() => generateRandomCode(promoForm.discount_percent)}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. ARENA50 or FREEVIP100"
                  value={promoForm.code}
                  onChange={(e) =>
                    setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold uppercase text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              {/* Applicable Plan */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Applicable Plan
                </label>
                <select
                  value={promoForm.applicable_plan}
                  onChange={(e) =>
                    setPromoForm({ ...promoForm, applicable_plan: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                >
                  <option value="All Plans">All Plans</option>
                  <option value="ArenaX Pro Daily">ArenaX Pro Daily (2,000 TZS)</option>
                  <option value="ArenaX Pro Weekly">ArenaX Pro Weekly (10,000 TZS)</option>
                  <option value="ArenaX Pro Monthly">ArenaX Pro Monthly (25,000 TZS)</option>
                </select>
              </div>

              {/* Max Redemptions & User Duration & Admin Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Max Redemptions
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={promoForm.max_uses}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, max_uses: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    User Access Pass
                  </label>
                  <select
                    value={promoForm.durationMinutes}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  >
                    <option value={1440}>24 Hours (Full Day)</option>
                    <option value={360}>6 Hours</option>
                    <option value={60}>1 Hour</option>
                    <option value={30}>30 Minutes</option>
                    <option value={5}>5 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Campaign Expiry
                  </label>
                  <select
                    value={promoForm.campaignDays}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, campaignDays: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  >
                    <option value={0}>♾️ Never (Live Forever)</option>
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={365}>1 Year</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPromo}
                  className="px-5 py-2 rounded-xl bg-[#e50914] hover:bg-red-700 text-white text-sm font-bold shadow-sm"
                >
                  {savingPromo ? 'Creating...' : 'Create Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
