'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Trash2,
  Sparkles,
  Loader2,
  X,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  created_at: string | null;
  updated_at?: string | null;
}

interface UserSubscription {
  id: string;
  user_id: string | null;
  plan_name: string;
  provider: string;
  phone: string | null;
  amount: number;
  status: string;
  activated_at: string | null;
  expires_at: string;
  created_at: string | null;
}

export default function AdminUsersPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUBSCRIBER' | 'FREE' | 'ADMIN'>('ALL');

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'user' as 'user' | 'admin',
  });
  const [savingUser, setSavingUser] = useState(false);

  // Grant VIP Access Modal
  const [vipTargetUser, setVipTargetUser] = useState<UserProfile | null>(null);
  const [vipForm, setVipForm] = useState({
    plan_name: 'Monthly VIP Pass',
    days: 30,
  });
  const [grantingVip, setGrantingVip] = useState(false);

  const fetchUsersAndSubs = async () => {
    setLoading(true);
    try {
      const [{ data: profilesData }, { data: subsData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('subscriptions')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (profilesData) {
        setUsers(profilesData as UserProfile[]);
      }
      if (subsData) {
        setSubscriptions(subsData as UserSubscription[]);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndSubs();
  }, []);

  // Helper to get active subscription for a user
  const getUserActiveSub = (userId: string): UserSubscription | undefined => {
    const now = new Date();
    return subscriptions.find(
      (sub) =>
        sub.user_id === userId &&
        sub.status === 'active' &&
        (!sub.expires_at || new Date(sub.expires_at) > now)
    );
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingUser(true);
    try {
      const payload = {
        name: editForm.name.trim() || null,
        email: editForm.email.trim() || null,
        role: editForm.role,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', editingUser.id);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...payload } : u))
      );
      setEditingUser(null);
    } catch (err: any) {
      alert('Failed to update user: ' + err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to remove ${user.name || user.email || 'this user'}?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      alert('Failed to delete user: ' + err.message);
    }
  };

  const openGrantVipModal = (user: UserProfile) => {
    setVipTargetUser(user);
    setVipForm({
      plan_name: 'Monthly VIP Pass',
      days: 30,
    });
  };

  const handleGrantVip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vipTargetUser) return;

    setGrantingVip(true);
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + vipForm.days * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('subscriptions')
        .insert([
          {
            user_id: vipTargetUser.id,
            plan_name: vipForm.plan_name,
            provider: 'Admin Grant',
            phone: vipTargetUser.email || 'Admin VIP',
            amount: 0,
            status: 'active',
            activated_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
        ])
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        setSubscriptions((prev) => [data[0] as UserSubscription, ...prev]);
      } else {
        await fetchUsersAndSubs();
      }
      setVipTargetUser(null);
    } catch (err: any) {
      alert('Failed to grant VIP access: ' + err.message);
    } finally {
      setGrantingVip(false);
    }
  };

  // KPI Metrics
  const totalUsersCount = users.length;
  const activeSubscribersCount = users.filter((u) => Boolean(getUserActiveSub(u.id))).length;
  const adminsCount = users.filter((u) => u.role === 'admin').length;

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());

    const activeSub = getUserActiveSub(u.id);
    const matchesFilter =
      roleFilter === 'ALL' ||
      (roleFilter === 'ADMIN' && u.role === 'admin') ||
      (roleFilter === 'SUBSCRIBER' && Boolean(activeSub)) ||
      (roleFilter === 'FREE' && !activeSub);

    return matchesSearch && matchesFilter;
  });

  const getInitials = (name?: string | null, email?: string | null) => {
    const source = (name || email || 'U').trim();
    const parts = source.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Users
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage registered accounts, admin roles, and VIP subscription access.
          </p>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* All Users */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              All Users
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalUsersCount}</p>
            <p className="text-xs text-slate-400 mt-1">Registered accounts</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-500">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Subscribers */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Subscribers
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{activeSubscribersCount}</p>
            <p className="text-xs text-slate-400 mt-1">Users with active VIP plan</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Admins */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Admins
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{adminsCount}</p>
            <p className="text-xs text-slate-400 mt-1">Back-office portal access</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="relative min-w-[190px]">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full appearance-none pl-4 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="ALL">All Users ({totalUsersCount})</option>
            <option value="SUBSCRIBER">Active Subscribers ({activeSubscribersCount})</option>
            <option value="FREE">Free Users ({totalUsersCount - activeSubscribersCount})</option>
            <option value="ADMIN">Admins ({adminsCount})</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3 text-slate-500 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            <span>Loading users from Supabase...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">No users found</p>
              <p className="text-xs text-slate-500 mt-1">
                {users.length === 0
                  ? 'New accounts will appear here automatically as users sign up.'
                  : 'Try clearing your search or switching the user filter.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50/60">
                <tr>
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Subscription</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const activeSub = getUserActiveSub(user.id);
                  const joinedDate = user.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* User Avatar + Name + Email */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/90 flex items-center justify-center shrink-0 text-xs font-extrabold text-slate-700">
                            {getInitials(user.name, user.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 leading-tight truncate max-w-[240px]">
                              {user.name || (user.email ? user.email.split('@')[0] : 'ArenaX User')}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[280px] mt-0.5">
                              {user.email || 'No email address'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                            User
                          </span>
                        )}
                      </td>

                      {/* Subscription Status */}
                      <td className="py-3.5 px-4">
                        {activeSub ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {activeSub.plan_name || 'VIP Active'}
                            </span>
                            {activeSub.expires_at && (
                              <span className="text-[11px] text-slate-400 mt-0.5">
                                Expires{' '}
                                {new Date(activeSub.expires_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200/80">
                            Free Plan
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500">
                        {joinedDate}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openGrantVipModal(user)}
                            title="Grant VIP Subscription Access"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Grant VIP
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            title="Edit User Role & Details"
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete User"
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit User</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update profile details and portal role permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="User's name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Account Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value as 'user' | 'admin' })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                >
                  <option value="user">User (Standard Viewer)</option>
                  <option value="admin">Admin (Back-Office Portal Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 rounded-xl bg-[#e50914] hover:bg-red-700 text-white text-sm font-bold shadow-sm"
                >
                  {savingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Grant VIP Subscription Modal */}
      {vipTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Grant VIP Subscription</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Activate complimentary VIP stream access for{' '}
                  <span className="font-semibold text-slate-800">
                    {vipTargetUser.name || vipTargetUser.email}
                  </span>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVipTargetUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrantVip} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">
                  Select VIP Pass Duration
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: '7 Days', days: 7, plan: 'Weekly VIP Pass' },
                    { label: '30 Days', days: 30, plan: 'Monthly VIP Pass' },
                    { label: '1 Year', days: 365, plan: 'Annual VIP Pass' },
                  ].map((preset) => {
                    const selected = vipForm.days === preset.days;
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() =>
                          setVipForm({ plan_name: preset.plan, days: preset.days })
                        }
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          selected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={vipForm.plan_name}
                  onChange={(e) => setVipForm({ ...vipForm, plan_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVipTargetUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={grantingVip}
                  className="px-5 py-2 rounded-xl bg-[#e50914] hover:bg-red-700 text-white text-sm font-bold shadow-sm"
                >
                  {grantingVip ? 'Activating...' : 'Activate VIP Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

