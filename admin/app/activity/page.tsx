'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  UserPlus,
  CreditCard,
  Search,
  ChevronDown,
  Loader2,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ActivityEvent {
  id: string;
  type: 'signup' | 'subscription';
  title: string;
  actor: string;
  details: string;
  createdAt: string;
}

export default function AdminActivityPage() {
  const supabase = createClient();

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SIGNUP' | 'SUBSCRIPTION'>('ALL');

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('subscriptions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      const profileMap = new Map<string, { name?: string | null; email?: string | null }>();
      if (profiles) {
        profiles.forEach((p: any) => {
          profileMap.set(p.id, { name: p.name, email: p.email });
        });
      }

      const combined: ActivityEvent[] = [];

      if (profiles) {
        profiles.forEach((profile: any) => {
          const displayName =
            profile.name ||
            (profile.email ? profile.email.split('@')[0] : 'New User');
          combined.push({
            id: `signup-${profile.id}`,
            type: 'signup',
            title: 'New user signup',
            actor: displayName,
            details: profile.email || 'Registered ArenaX account',
            createdAt: profile.created_at || new Date().toISOString(),
          });
        });
      }

      if (subscriptions) {
        subscriptions.forEach((sub: any) => {
          const linkedProfile = sub.user_id ? profileMap.get(sub.user_id) : undefined;
          const actorName =
            linkedProfile?.name ||
            linkedProfile?.email ||
            sub.phone ||
            'Subscriber';
          const amountFormatted = `${Number(sub.amount || 0).toLocaleString()} TZS`;
          const providerName = sub.provider || 'M-Pesa';

          combined.push({
            id: `sub-${sub.id}`,
            type: 'subscription',
            title: `New subscription • ${sub.plan_name || 'VIP Plan'}`,
            actor: actorName,
            details: `${amountFormatted} via ${providerName}${
              sub.phone ? ` (${sub.phone})` : ''
            }`,
            createdAt: sub.created_at || sub.activated_at || new Date().toISOString(),
          });
        });
      }

      combined.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setEvents(combined);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    const channel = supabase
      .channel('admin_activity_log_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchActivities()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalSignups = events.filter((e) => e.type === 'signup').length;
  const totalSubscriptions = events.filter((e) => e.type === 'subscription').length;

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.actor.toLowerCase().includes(search.toLowerCase()) ||
      event.details.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'SIGNUP' && event.type === 'signup') ||
      (typeFilter === 'SUBSCRIPTION' && event.type === 'subscription');

    return matchesSearch && matchesType;
  });

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Activity
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Chronological log of all recent user signups and subscription transactions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchActivities}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-bold text-xs shadow-2xs transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              All Activities
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{events.length}</p>
            <p className="text-xs text-slate-400 mt-1">Total logged events</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-500">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              User Signups
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalSignups}</p>
            <p className="text-xs text-slate-400 mt-1">New account registrations</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-500">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Subscriptions
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalSubscriptions}</p>
            <p className="text-xs text-slate-400 mt-1">Plan activations & payments</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-500">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search activity by user, email, phone, or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="relative min-w-[200px]">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full appearance-none pl-4 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="ALL">All Activities ({events.length})</option>
            <option value="SIGNUP">User Signups ({totalSignups})</option>
            <option value="SUBSCRIPTION">Subscriptions ({totalSubscriptions})</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 4. Activity Log Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3 text-slate-500 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            <span>Loading activity log...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">No activity recorded yet</p>
              <p className="text-xs text-slate-500 mt-1">
                New user signups and subscription activations will automatically appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50/60">
                <tr>
                  <th className="py-3.5 px-5">Activity</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-5 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((event) => {
                  const isSubscription = event.type === 'subscription';

                  return (
                    <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Activity Event & Actor */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center shrink-0 text-slate-500">
                            {isSubscription ? (
                              <CreditCard className="w-4 h-4" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 leading-tight truncate max-w-[280px]">
                              {event.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[260px] mt-0.5">
                              {event.actor}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Event Type Badge */}
                      <td className="py-3.5 px-4">
                        {isSubscription ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Subscription
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                            User Signup
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                        {event.details}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-5 text-right text-xs font-medium text-slate-400 whitespace-nowrap">
                        {formatDateTime(event.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

