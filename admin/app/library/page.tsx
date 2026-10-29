'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  Plus,
  Search,
  Play,
  Copy,
  Check,
  Edit2,
  Trash2,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface LibraryPlaylist {
  id: string;
  name: string;
  url: string;
  category: string;
  region: string;
  notes: string;
  created_at?: string;
}

export const DEFAULT_LIBRARY_PLAYLISTS: LibraryPlaylist[] = [
  {
    id: 'lib-astra-multi',
    name: 'Astra Multi-Channel Server',
    url: 'http://38.190.100.202:8000/playlist.m3u8',
    category: 'Multi-Category',
    region: 'International',
    notes: '165+ live channels including Sports, Movies, News, and Kids',
  },
  {
    id: 'lib-iptv-tz',
    name: 'IPTV-Org Tanzania (TZ)',
    url: 'https://iptv-org.github.io/iptv/countries/tz.m3u',
    category: 'Tanzania',
    region: 'Tanzania',
    notes: 'Official IPTV-Org country feed for Tanzanian local channels',
  },
  {
    id: 'lib-iptv-ke',
    name: 'IPTV-Org Kenya (KE)',
    url: 'https://iptv-org.github.io/iptv/countries/ke.m3u',
    category: 'East Africa',
    region: 'Kenya',
    notes: 'East African Kenyan live TV streams',
  },
  {
    id: 'lib-iptv-ug',
    name: 'IPTV-Org Uganda (UG)',
    url: 'https://iptv-org.github.io/iptv/countries/ug.m3u',
    category: 'East Africa',
    region: 'Uganda',
    notes: 'East African Ugandan live TV streams',
  },
  {
    id: 'lib-iptv-sports',
    name: 'IPTV-Org Global Sports',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
    category: 'Sports',
    region: 'Global',
    notes: 'Global sports & football channels playlist for finding backup sports feeds',
  },
  {
    id: 'lib-iptv-movies',
    name: 'IPTV-Org Movies & Cinema',
    url: 'https://iptv-org.github.io/iptv/categories/movies.m3u',
    category: 'Movies',
    region: 'Global',
    notes: 'Movie channels and 24/7 cinema streams',
  },
  {
    id: 'lib-iptv-kids',
    name: 'IPTV-Org Animation & Kids',
    url: 'https://iptv-org.github.io/iptv/categories/animation.m3u',
    category: 'Cartoons',
    region: 'Global',
    notes: 'Cartoons, anime, and family animation channels',
  },
  {
    id: 'lib-iptv-doc',
    name: 'IPTV-Org Documentary & Nature',
    url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u',
    category: 'Animals',
    region: 'Global',
    notes: 'Wildlife, nature, science, and documentary channels',
  },
  {
    id: 'lib-iptv-news',
    name: 'IPTV-Org World News',
    url: 'https://iptv-org.github.io/iptv/categories/news.m3u',
    category: 'News',
    region: 'Global',
    notes: '24/7 international breaking news networks',
  },
  {
    id: 'lib-iptv-music',
    name: 'IPTV-Org Music Channels',
    url: 'https://iptv-org.github.io/iptv/categories/music.m3u',
    category: 'Music',
    region: 'Global',
    notes: 'Live music video and concert channels',
  },
  {
    id: 'lib-freetv-global',
    name: 'Free-TV Global Curated M3U',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
    category: 'Multi-Category',
    region: 'Global',
    notes: 'Curated high-uptime free-to-air global TV channels',
  },
];

export const LIBRARY_STORAGE_KEY = 'arenax_playlist_library_v1';

const LIBRARY_CATEGORIES = [
  'Multi-Category',
  'Tanzania',
  'East Africa',
  'Sports',
  'Football',
  'Movies',
  'Cartoons',
  'Animals',
  'News',
  'Music',
];

export default function AdminLibraryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [libraryItems, setLibraryItems] = useState<LibraryPlaylist[]>(DEFAULT_LIBRARY_PLAYLISTS);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryPlaylist | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: 'Multi-Category',
    region: 'Global',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('library')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        if (data.length === 0) {
          const seedRows = DEFAULT_LIBRARY_PLAYLISTS.map((item) => ({
            id: item.id,
            name: item.name,
            url: item.url,
            category: item.category,
            region: item.region,
            notes: item.notes,
          }));
          const { data: inserted, error: seedErr } = await supabase
            .from('library')
            .upsert(seedRows, { onConflict: 'id' })
            .select('*');

          if (!seedErr && inserted && inserted.length > 0) {
            setLibraryItems(inserted as LibraryPlaylist[]);
            localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(inserted));
            setLoading(false);
            return;
          }
        } else {
          setLibraryItems(data as LibraryPlaylist[]);
          localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(data));
          setLoading(false);
          return;
        }
      }
    } catch {}

    // Fallback to localStorage or default curated playlists
    try {
      const cached = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLibraryItems(parsed);
          setLoading(false);
          return;
        }
      }
    } catch {}

    setLibraryItems(DEFAULT_LIBRARY_PLAYLISTS);
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(DEFAULT_LIBRARY_PLAYLISTS));
    setLoading(false);
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      url: '',
      category: 'Multi-Category',
      region: 'Global',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: LibraryPlaylist) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      url: item.url,
      category: item.category || 'Multi-Category',
      region: item.region || 'Global',
      notes: item.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) return;

    setSaving(true);
    const id =
      editingItem?.id ||
      'lib-' +
        formData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Math.floor(100 + Math.random() * 900);

    const payload: LibraryPlaylist = {
      id,
      name: formData.name.trim(),
      url: formData.url.trim(),
      category: formData.category.trim() || 'Multi-Category',
      region: formData.region.trim() || 'Global',
      notes: formData.notes.trim(),
    };

    try {
      await supabase.from('library').upsert(
        [
          {
            id: payload.id,
            name: payload.name,
            url: payload.url,
            category: payload.category,
            region: payload.region,
            notes: payload.notes,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'id' }
      );
    } catch {}

    setLibraryItems((prev) => {
      const exists = prev.some((item) => item.id === payload.id);
      const next = exists
        ? prev.map((item) => (item.id === payload.id ? payload : item))
        : [payload, ...prev];
      try {
        localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    setSaving(false);
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('library').delete().eq('id', id);
    } catch {}

    setLibraryItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleTestInPlaylist = (item: LibraryPlaylist) => {
    router.push(`/playlist?url=${encodeURIComponent(item.url)}`);
  };

  const categories = ['ALL', ...Array.from(new Set(libraryItems.map((i) => i.category).filter(Boolean)))];

  const filteredItems = libraryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.url.toLowerCase().includes(search.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.region || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Saved M3U & M3U8 playlist URLs for hunting new and backup live channels.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Playlist URL
        </button>
      </div>

      {/* 2. Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search saved playlists by name, URL, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="relative min-w-[190px]">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full appearance-none pl-4 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 3. Library Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3 text-slate-500 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            <span>Loading saved playlists from Library...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">No playlists found</p>
              <p className="text-xs text-slate-500 mt-1">
                Click &ldquo;Add Playlist URL&rdquo; to store a new M3U or M3U8 playlist in your Library.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50/60">
                <tr>
                  <th className="py-3.5 px-5">Playlist</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isCopied = copiedId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Playlist Name & Notes */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center shrink-0 text-slate-500">
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 leading-tight truncate max-w-[260px]">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[360px] mt-0.5">
                              {item.notes || item.region || 'Saved M3U Playlist'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                          {item.category || 'Multi-Category'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTestInPlaylist(item)}
                            title="Open and test all channels in Playlist Playground"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Load in Playlist
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyUrl(item.id, item.url)}
                            title="Copy Playlist URL"
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit Playlist"
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            title="Delete Playlist"
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

      {/* 4. Add / Edit Playlist Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingItem ? 'Edit Library Playlist' : 'Add Playlist to Library'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save an M3U or M3U8 playlist link for finding new and backup channels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Playlist Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. East Africa Sports M3U"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Playlist URL (.m3u / .m3u8) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="http://.../playlist.m3u8"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  >
                    {LIBRARY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    placeholder="Global / Tanzania"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Notes / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Good for SuperSport and Azam backup streams"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#e50914] hover:bg-red-700 text-white text-sm font-bold shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

