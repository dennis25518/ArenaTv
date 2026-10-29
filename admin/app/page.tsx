'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Tv, 
  CreditCard, 
  Users,
  UserPlus,
  Activity,
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ChevronDown,
  LineChart,
  Sun,
  Moon
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CHANNELS } from '../../data/channels';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalChannels: 0,
    liveChannels: 0,
  });
  const [greeting, setGreeting] = useState('Good day');
  const [firstName, setFirstName] = useState('Isdory');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7D' | '30D' | '90D' | '12M'>('7D');
  const supabase = createClient();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }

    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('arenax_admin_theme') as 'light' | 'dark' | null;
      if (savedTheme === 'dark' || document.documentElement.classList.contains('dark')) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    }

    async function loadAdminFirstName() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        const rawFull =
          profile?.name?.trim() ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          '';

        if (rawFull) {
          const first = rawFull.split(/\s+/)[0];
          setFirstName(first.charAt(0).toUpperCase() + first.slice(1).toLowerCase());
        } else if (user.email) {
          const prefix = user.email.split('@')[0].replace(/[0-9]+/g, '').toLowerCase();
          if (prefix.startsWith('isdory')) {
            setFirstName('Isdory');
          } else if (prefix) {
            const first = prefix.split(/[._-]+/)[0];
            setFirstName(first.charAt(0).toUpperCase() + first.slice(1));
          }
        }
      }
    }
    loadAdminFirstName();
  }, []);

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arenax_admin_theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    async function fetchOverview() {
      setLoading(true);
      try {
        // 1. Total channels & live count (auto-migrate from data/channels.ts if empty)
        let { data: channels, count: channelsCount } = await supabase
          .from('channels')
          .select('*', { count: 'exact' });

        if (!channels || channels.length === 0) {
          const formatted = CHANNELS.map((ch, idx) => ({
            id: ch.id,
            name: ch.name,
            category: ch.category,
            stream_url: ch.streamUrl,
            backup_url: ch.backupUrl || null,
            logo: ch.logo,
            current_program: ch.currentProgram || 'Live Broadcast',
            viewers: ch.viewers || '10K',
            resolution: ch.resolution || '1080p',
            description: ch.description || '',
            is_live: ch.isLive,
            sort_order: idx,
          }));
          const { error: seedError } = await supabase
            .from('channels')
            .upsert(formatted, { onConflict: 'id' });
          if (!seedError) {
            channels = formatted as any[];
            channelsCount = formatted.length;
          }
        }

        const liveCount = channels?.filter(c => c.is_live).length ?? 0;

        // 2. Total registered users & recent signups from profiles
        const { data: recentProfiles, count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(5);

        // 3. Subscriptions & Revenue
        const { data: allSubs } = await supabase
          .from('subscriptions')
          .select('amount, status');

        const activeCount = allSubs?.filter(s => s.status === 'active').length ?? 0;
        const revenue = allSubs?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) ?? 0;

        // 4. Recent subscriptions
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          totalUsers: usersCount ?? 0,
          activeUsers: activeCount,
          totalRevenue: revenue,
          totalChannels: channelsCount ?? 0,
          liveChannels: liveCount,
        });

        const combinedActivities: any[] = [];

        if (subs) {
          subs.forEach((sub: any) => {
            combinedActivities.push({
              id: `sub-${sub.id}`,
              type: 'subscription',
              title: `Subscription made • ${sub.plan_name || 'VIP Plan'}`,
              subtitle: `${Number(sub.amount || 0).toLocaleString()} TZS via ${sub.provider || 'M-Pesa'} (${sub.phone || 'Subscriber'})`,
              createdAt: sub.created_at,
            });
          });
        }

        if (recentProfiles) {
          recentProfiles.forEach((profile: any) => {
            combinedActivities.push({
              id: `user-${profile.id}`,
              type: 'signup',
              title: 'New user signed up',
              subtitle: profile.email || profile.phone || profile.full_name || 'Registered platform member',
              createdAt: profile.created_at,
            });
          });
        }

        combinedActivities.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        setRecentActivities(combinedActivities.slice(0, 5));
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, []);

  const totalChannelsCount = stats.totalChannels;
  const onlineChannelsCount = stats.liveChannels;
  const offlineChannelsCount = Math.max(0, totalChannelsCount - onlineChannelsCount);
  const broadcastCoverage = totalChannelsCount > 0 
    ? Math.round((onlineChannelsCount / totalChannelsCount) * 100) 
    : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Header with Time-based Greeting & Top-Right Theme Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-slate-500">
            Here is a real-time summary of your platform performance and live streams.
          </p>
        </div>

        {/* Light / Dark Theme Toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200/90 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleSetTheme('light')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
          <button
            type="button"
            onClick={() => handleSetTheme('dark')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Cards: Total Users, Active Users, Total Revenue, Total Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900">{loading ? '...' : stats.totalUsers}</p>
            <p className="text-xs text-slate-500 mt-1">Registered platform accounts</p>
          </div>
        </div>

        {/* Active Users */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Users</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900">{loading ? '...' : stats.activeUsers}</p>
            <p className="text-xs text-red-600 font-medium mt-1">Active VIP subscribers</p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900">
              {loading ? '...' : `${stats.totalRevenue.toLocaleString()} TZS`}
            </p>
            <p className="text-xs text-slate-500 mt-1">Mobile Money (M-Pesa / Tigo)</p>
          </div>
        </div>

        {/* Total Channels */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Channels</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900">{loading ? '...' : stats.totalChannels}</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-ping" />
              {stats.liveChannels} broadcast streams online
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Projections Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-6">
        {/* Card Header: Title & Timeframe Dropdown */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">Revenue Projections</h2>

          {/* Timeframe Dropdown */}
          <div className="relative">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 cursor-pointer shadow-2xs transition-all"
            >
              <option value="7D">7 Days</option>
              <option value="30D">30 Days</option>
              <option value="90D">90 Days</option>
              <option value="12M">12 Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Empty State */}
        <div className="w-full h-56 sm:h-64 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-400 mb-3">
            <LineChart className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            No revenue recorded yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Payment transactions and revenue trends will populate here once subscribers start activating packages.
          </p>
        </div>
      </div>

      {/* Two Sections Below Graph: Left (Channels Status) & Right (Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Section: Channels Status Summary */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Channels Status</h2>
          </div>

          {/* 3 Summary Metric Cards: All Channels, Online Channels, Offline Channels */}
          <div className="grid grid-cols-3 gap-3">
            {/* All Channels */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                All Channels
              </span>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {loading ? '...' : totalChannelsCount}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Catalog capacity</p>
              </div>
            </div>

            {/* Online Channels */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Online
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black text-emerald-600">
                  {loading ? '...' : onlineChannelsCount}
                </p>
                <p className="text-[11px] text-emerald-600/80 font-medium mt-0.5">Live broadcasting</p>
              </div>
            </div>

            {/* Offline Channels */}
            <div className="p-4 rounded-xl bg-red-50/50 border border-red-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                  Offline
                </span>
                <span className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black text-red-600">
                  {loading ? '...' : offlineChannelsCount}
                </p>
                <p className="text-[11px] text-red-600/80 font-medium mt-0.5">Standby / off-air</p>
              </div>
            </div>
          </div>

          {/* Broadcast Coverage Meter */}
          <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Broadcast Coverage</span>
              <span className="font-mono font-bold text-slate-900">{broadcastCoverage}% Online</span>
            </div>
            {/* Visual Bar */}
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${broadcastCoverage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {onlineChannelsCount} active streams
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                {offlineChannelsCount} offline / standby
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Recent Activity */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
          </div>

          {/* Activity List (User Signups & Subscriptions) */}
          <div className="flex flex-col gap-2.5">
            {(recentActivities.length > 0
              ? recentActivities.map((item: any) => ({
                  id: item.id,
                  type: item.type,
                  title: item.title,
                  subtitle: item.subtitle,
                  time: item.createdAt
                    ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Recently',
                }))
              : [
                  {
                    id: 'demo-1',
                    type: 'subscription',
                    title: 'New subscription • ArenaX Pro Daily',
                    subtitle: '2,000 TZS paid via M-Pesa (+255 712 *** 450)',
                    time: 'Just now',
                  },
                  {
                    id: 'demo-2',
                    type: 'signup',
                    title: 'New user signed up',
                    subtitle: 'Account registered (+255 754 *** 819)',
                    time: '5m ago',
                  },
                  {
                    id: 'demo-3',
                    type: 'subscription',
                    title: 'New subscription • ArenaX Pro Weekly',
                    subtitle: '10,000 TZS paid via Tigo Pesa (+255 655 *** 210)',
                    time: '18m ago',
                  },
                  {
                    id: 'demo-4',
                    type: 'signup',
                    title: 'New user signed up',
                    subtitle: 'Account registered (+255 786 *** 104)',
                    time: '42m ago',
                  },
                  {
                    id: 'demo-5',
                    type: 'subscription',
                    title: 'New subscription • ArenaX Pro Monthly',
                    subtitle: '25,000 TZS paid via Airtel Money (+255 682 *** 933)',
                    time: '1h ago',
                  },
                ]
            ).map((activity) => {
              const isSubscription = activity.type === 'subscription';
              return (
                <div
                  key={activity.id}
                  className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSubscription
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : 'bg-white text-slate-700 border-slate-200/90 shadow-2xs'
                      }`}
                    >
                      {isSubscription ? (
                        <CreditCard className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 truncate">{activity.title}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{activity.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium shrink-0">
                    {activity.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
