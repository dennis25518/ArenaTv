'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Tv,
  Plus,
  Trash2,
  Power,
  RefreshCw,
  Search,
  DownloadCloud,
  Edit3,
  Copy,
  Check,
  Play,
  X,
  ChevronDown,
  Radio,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CHANNELS } from '../../../data/channels';

const CHANNEL_CATEGORIES = [
  'Tanzania',
  'Football',
  'Sports',
  'Motorsport',
  'Racing',
  'Golf',
  'News',
  'Music',
  'Entertainment',
  'Movies',
  'Cartoons',
  'Animals',
  'General',
];

export default function AdminChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Copy & Preview state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewChannel, setPreviewChannel] = useState<any | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Stream URL Health state: 'CHECKING' | 'ONLINE' | 'OFFLINE'
  const [healthMap, setHealthMap] = useState<Record<string, 'CHECKING' | 'ONLINE' | 'OFFLINE'>>({});

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: 'Tanzania',
    stream_url: '',
    backup_url: '',
    logo: '',
    current_program: '',
    description: '',
    is_live: true,
  });

  const supabase = createClient();

  const buildSeedPayload = () =>
    CHANNELS.map((ch, idx) => ({
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

  const checkChannelUrlHealth = async (ch: any) => {
    setHealthMap((prev) => ({ ...prev, [ch.id]: 'CHECKING' }));
    try {
      const res = await fetch('/api/check-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ch.stream_url }),
      });
      const result = await res.json();
      const isAlive = Boolean(result?.alive);

      setHealthMap((prev) => ({ ...prev, [ch.id]: isAlive ? 'ONLINE' : 'OFFLINE' }));

      // If stream URL is dead, automatically set Visibility to Hidden (is_live = false)
      if (!isAlive && ch.is_live) {
        await supabase.from('channels').update({ is_live: false }).eq('id', ch.id);
        setChannels((prev) =>
          prev.map((item) => (item.id === ch.id ? { ...item, is_live: false } : item))
        );
      }
    } catch {
      setHealthMap((prev) => ({ ...prev, [ch.id]: 'OFFLINE' }));
    }
  };

  const verifyAllChannelsHealth = async (list: any[]) => {
    const batchSize = 6;
    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize);
      await Promise.all(batch.map((ch) => checkChannelUrlHealth(ch)));
    }
  };

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Auto-migrate all channels from data/channels.ts if Supabase table is empty
      if (!data || data.length === 0) {
        setSeeding(true);
        const formatted = buildSeedPayload();
        const { error: seedError } = await supabase
          .from('channels')
          .upsert(formatted, { onConflict: 'id' });

        if (!seedError) {
          const { data: seededData } = await supabase
            .from('channels')
            .select('*')
            .order('sort_order', { ascending: true });
          const finalChannels = seededData || formatted;
          setChannels(finalChannels);
          verifyAllChannelsHealth(finalChannels);
        } else {
          console.error('Auto-migration error:', seedError);
          setChannels([]);
        }
        setSeeding(false);
      } else {
        setChannels(data);
        verifyAllChannelsHealth(data);
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  // Setup HLS video player when previewChannel changes (routed via /api/stream-proxy to bypass CORS)
  useEffect(() => {
    if (!previewChannel || !videoRef.current) return;

    const video = videoRef.current;
    const rawUrl = previewChannel.stream_url;
    if (!rawUrl) return;

    const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(rawUrl)}`;
    let hlsInstance: any = null;

    const initPlayer = async () => {
      if (!(window as any).Hls) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        }).catch(() => {});
      }

      const Hls = (window as any).Hls;
      if (Hls && Hls.isSupported()) {
        hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsInstance.loadSource(proxiedUrl);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      } else {
        video.src = proxiedUrl;
      }
    };

    initPlayer();

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [previewChannel]);

  const handleSeedChannels = async () => {
    if (!confirm(`Are you sure you want to seed ${CHANNELS.length} initial channels into Supabase?`)) {
      return;
    }
    setSeeding(true);
    try {
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

      const { error } = await supabase.from('channels').upsert(formatted, { onConflict: 'id' });
      if (error) throw error;

      await fetchChannels();
      alert('Successfully seeded channels into database!');
    } catch (err: any) {
      console.error('Seeding error:', err);
      alert('Error seeding channels: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleLive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('channels')
        .update({ is_live: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setChannels(channels.map((c) => (c.id === id ? { ...c, is_live: !currentStatus } : c)));
    } catch (err: any) {
      alert('Failed to update channel: ' + err.message);
    }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    if (!confirm(`Delete channel "${name}"?`)) return;
    try {
      const { error } = await supabase.from('channels').delete().eq('id', id);
      if (error) throw error;
      setChannels(channels.filter((c) => c.id !== id));
    } catch (err: any) {
      alert('Failed to delete channel: ' + err.message);
    }
  };

  const openAddModal = () => {
    setEditingChannelId(null);
    setFormData({
      id: '',
      name: '',
      category: 'Tanzania',
      stream_url: '',
      backup_url: '',
      logo: '',
      current_program: '',
      description: '',
      is_live: true,
    });
    setShowModal(true);
  };

  const openEditModal = (ch: any) => {
    setEditingChannelId(ch.id);
    setFormData({
      id: ch.id || '',
      name: ch.name || '',
      category: ch.category || 'Tanzania',
      stream_url: ch.stream_url || '',
      backup_url: ch.backup_url || '',
      logo: ch.logo || '',
      current_program: ch.current_program || '',
      description: ch.description || '',
      is_live: ch.is_live ?? true,
    });
    setShowModal(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingChannelId) {
        // Update existing channel
        const payload = {
          name: formData.name.trim(),
          category: formData.category,
          stream_url: formData.stream_url.trim(),
          backup_url: formData.backup_url.trim() || null,
          logo: formData.logo.trim() || 'https://i.imgur.com/OmiVZ1u.png',
          current_program: formData.current_program.trim() || 'Live Broadcast',
          description: formData.description.trim() || '',
          is_live: formData.is_live,
        };

        const { error } = await supabase
          .from('channels')
          .update(payload)
          .eq('id', editingChannelId);

        if (error) throw error;
      } else {
        // Create new channel
        const channelId =
          formData.id.trim() ||
          formData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        const { error } = await supabase.from('channels').insert([
          {
            id: channelId,
            name: formData.name.trim(),
            category: formData.category,
            stream_url: formData.stream_url.trim(),
            backup_url: formData.backup_url.trim() || null,
            logo: formData.logo.trim() || 'https://i.imgur.com/OmiVZ1u.png',
            current_program: formData.current_program.trim() || 'Live Broadcast',
            description: formData.description.trim() || '',
            is_live: formData.is_live,
          },
        ]);

        if (error) throw error;
      }

      setShowModal(false);
      await fetchChannels();
    } catch (err: any) {
      alert('Failed to save channel: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = (id: string, url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const formatStreamDomain = (url: string) => {
    if (!url) return 'No stream URL';
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url;
    }
  };

  // Summary counts
  const totalCount = channels.length;
  const onlineCount = channels.filter((c) => c.is_live).length;
  const offlineCount = Math.max(0, totalCount - onlineCount);

  // Categories list dynamically enriched by any custom DB categories
  const availableCategories = Array.from(
    new Set([
      ...CHANNEL_CATEGORIES,
      ...channels.map((c) => c.category).filter(Boolean),
    ])
  );

  // Filtered channels
  const filteredChannels = channels.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.current_program?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || c.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Channels
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage live broadcast channels, stream sources, and online availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {channels.length === 0 && !loading && (
            <button
              onClick={handleSeedChannels}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-2xs transition-all"
            >
              <DownloadCloud className="w-4 h-4 text-red-600" />
              {seeding ? 'Seeding...' : 'Seed Default Channels'}
            </button>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e50914] hover:bg-red-700 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Channel
          </button>
        </div>
      </div>

      {/* 2. Quick Summary Strip: All Channels, Online Channels, Offline Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* All Channels */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              All Channels
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {loading ? '...' : totalCount}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Total configured streams</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Tv className="w-5 h-5" />
          </div>
        </div>

        {/* Online Channels */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Online
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {loading ? '...' : onlineCount}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Live broadcasting now
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        {/* Offline Channels */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Offline
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {loading ? '...' : offlineCount}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Standby / off-air
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Power className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by channel name or program..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl pl-3.5 pr-9 py-2.5 focus:outline-none focus:border-red-600 cursor-pointer transition-colors"
          >
            <option value="ALL">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 4. Channels Table List */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading channels from database...
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">No channels found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {channels.length === 0
                  ? 'Click "Seed Default Channels" above to import the initial channel lineup or add a new channel manually.'
                  : 'No channels match your current search or filter selection.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50/60">
                <tr>
                  <th className="py-3.5 px-5">Channel</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Visibility</th>
                  <th className="py-3.5 px-4">Health</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredChannels.map((ch) => {
                  const health = healthMap[ch.id] || 'ONLINE';
                  const isDead = health === 'OFFLINE';
                  const isChecking = health === 'CHECKING';

                  return (
                    <tr key={ch.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Channel Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={ch.logo || 'https://i.imgur.com/OmiVZ1u.png'}
                            alt={ch.name}
                            className="w-10 h-10 rounded-xl object-contain bg-slate-50 border border-slate-200/90 p-1.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 leading-tight truncate">
                              {ch.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[260px] mt-0.5">
                              {ch.current_program || ch.description || 'Live broadcast'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                          {ch.category || 'General'}
                        </span>
                      </td>

                      {/* Visibility Column (Lucide Eye / EyeOff icons, auto-hidden when stream URL is dead) */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleLive(ch.id, ch.is_live)}
                          title="Click to toggle channel visibility on user site"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            ch.is_live
                              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70'
                          }`}
                        >
                          {ch.is_live ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Health Column (Stream URL Working vs Dead) */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => checkChannelUrlHealth(ch)}
                          title="Click to re-check stream URL health"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            isChecking
                              ? 'bg-slate-50 text-slate-500 border-slate-200'
                              : isDead
                              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100/70'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100/70'
                          }`}
                        >
                          {isChecking ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>CHECKING</span>
                            </>
                          ) : (
                            <>
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isDead ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'
                                }`}
                              />
                              <span>{isDead ? 'OFFLINE' : 'ONLINE'}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(ch)}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Edit Channel"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChannel(ch.id, ch.name)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Channel"
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

      {/* 5. Unified Add / Edit Channel Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingChannelId ? 'Edit Channel' : 'Add New Channel'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingChannelId
                    ? 'Update channel details, stream feed URL, or broadcast availability.'
                    : 'Configure a new live television channel for ArenaX viewers.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Channel Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TBC 1 or SuperSport Premier League"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Primary Stream URL (M3U8 / HLS) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://.../index.m3u8"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Backup Stream URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://.../backup.m3u8"
                  value={formData.backup_url}
                  onChange={(e) => setFormData({ ...formData, backup_url: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Logo Image URL
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    {formData.logo ? (
                      <img
                        src={formData.logo}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Tv className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="url"
                    placeholder="https://i.imgur.com/..."
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Current Program / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Live Premier League Studio & Matchday"
                  value={formData.current_program}
                  onChange={(e) => setFormData({ ...formData, current_program: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <p className="text-xs font-bold text-slate-900">Channel Broadcast Status</p>
                  <p className="text-[11px] text-slate-500">
                    Set whether this stream is immediately online for viewers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_live: !formData.is_live })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    formData.is_live
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {formData.is_live ? 'ONLINE' : 'OFFLINE'}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#e50914] hover:bg-red-700 text-white text-sm font-bold shadow-sm"
                >
                  {saving ? 'Saving...' : editingChannelId ? 'Update Channel' : 'Save Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Stream Test / Preview Modal */}
      {previewChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 w-full max-w-2xl shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={previewChannel.logo || 'https://i.imgur.com/OmiVZ1u.png'}
                  alt={previewChannel.name}
                  className="w-9 h-9 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{previewChannel.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        previewChannel.is_live
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {previewChannel.is_live ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate max-w-md">
                    {previewChannel.stream_url}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewChannel(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Container */}
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative flex items-center justify-center">
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Testing stream playback directly from source feed</span>
              <a
                href={previewChannel.stream_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-red-600"
              >
                Open raw feed <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
