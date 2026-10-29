'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ListVideo,
  Play,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  Trash2,
  Radio,
  Globe,
  FileText,
  Link2,
  ChevronDown,
  Tv,
  X,
  RefreshCw,
  Square,
  Bookmark,
  FolderOpen,
  Edit2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ParsedStream {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  health: 'IDLE' | 'CHECKING' | 'ONLINE' | 'OFFLINE';
  statusCode?: number;
  addedToCatalog?: boolean;
}

interface LibraryPlaylist {
  id: string;
  name: string;
  url: string;
  category: string;
  region: string;
  notes: string;
  created_at?: string;
}

const DEFAULT_LIBRARY_PLAYLISTS: LibraryPlaylist[] = [
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

const LIBRARY_STORAGE_KEY = 'arenax_playlist_library_v1';

const PRESET_PLAYLISTS = [
  { label: 'Tanzania (TZ)', url: 'https://iptv-org.github.io/iptv/countries/tz.m3u' },
  { label: 'Sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
  { label: 'Movies', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
  { label: 'Animation / Kids', url: 'https://iptv-org.github.io/iptv/categories/animation.m3u' },
  { label: 'Music', url: 'https://iptv-org.github.io/iptv/categories/music.m3u' },
  { label: 'News', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
  { label: 'Documentary', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' },
];

const CHANNEL_CATEGORIES = [
  'Tanzania',
  'Football',
  'Sports',
  'News',
  'Music',
  'Movies',
  'Cartoons',
  'Animals',
  'Entertainment',
  'General',
];

function parseM3uContent(rawText: string, sourceUrl = ''): ParsedStream[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Check if this is an HLS master/media stream playlist rather than a channel list
  const isSingleHlsStream =
    lines.some(
      (l) =>
        l.startsWith('#EXT-X-STREAM-INF') ||
        l.startsWith('#EXT-X-TARGETDURATION') ||
        l.startsWith('#EXT-X-MEDIA-SEQUENCE')
    ) && !lines.some((l) => l.startsWith('#EXTINF:') && l.includes(','));

  if (isSingleHlsStream && sourceUrl) {
    let fallbackName = 'Direct M3U8 Stream';
    try {
      const parsed = new URL(sourceUrl);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      fallbackName = pathParts[pathParts.length - 2] || parsed.hostname || 'Direct Stream';
    } catch {}

    return [
      {
        id: `stream-${Date.now()}-0`,
        name: fallbackName,
        logo: '',
        group: 'Direct Stream',
        url: sourceUrl,
        health: 'ONLINE',
      },
    ];
  }

  const results: ParsedStream[] = [];
  let pendingInfo: { name: string; logo: string; group: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      const nameParts = line.split(',');
      const rawName =
        nameParts.length > 1 ? nameParts.slice(1).join(',').trim() : 'Unnamed Channel';

      pendingInfo = {
        name: rawName || 'Unnamed Channel',
        logo: logoMatch ? logoMatch[1].trim() : '',
        group: groupMatch ? groupMatch[1].split(';')[0].trim() || 'General' : 'General',
      };
    } else if (!line.startsWith('#') && (line.startsWith('http://') || line.startsWith('https://'))) {
      if (pendingInfo) {
        results.push({
          id: `stream-${Date.now()}-${results.length}`,
          name: pendingInfo.name,
          logo: pendingInfo.logo,
          group: pendingInfo.group,
          url: line,
          health: 'IDLE',
        });
        pendingInfo = null;
      } else {
        // Standalone URL line
        let name = `Stream #${results.length + 1}`;
        try {
          const u = new URL(line);
          name = u.hostname;
        } catch {}
        results.push({
          id: `stream-${Date.now()}-${results.length}`,
          name,
          logo: '',
          group: 'Direct Link',
          url: line,
          health: 'IDLE',
        });
      }
    }
  }

  return results;
}

function guessArenaCategory(group: string): string {
  const g = (group || '').toLowerCase();
  if (g.includes('tanzania') || g.includes('local')) return 'Tanzania';
  if (g.includes('sport') || g.includes('soccer') || g.includes('football')) return 'Sports';
  if (g.includes('news')) return 'News';
  if (g.includes('music')) return 'Music';
  if (g.includes('movie') || g.includes('cinema')) return 'Movies';
  if (g.includes('kid') || g.includes('anim') || g.includes('cartoon')) return 'Cartoons';
  if (g.includes('doc') || g.includes('nature') || g.includes('animal') || g.includes('wild'))
    return 'Animals';
  return 'General';
}

export default function AdminPlaylistPage() {
  const [inputMode, setInputMode] = useState<'URL' | 'RAW'>('URL');
  const [urlInput, setUrlInput] = useState('');
  const [rawInput, setRawInput] = useState('');
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  const [streams, setStreams] = useState<ParsedStream[]>([]);
  const [activeStream, setActiveStream] = useState<ParsedStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const stopScanRef = useRef(false);

  // Filters
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add to Live Channels Modal
  const [channelToSave, setChannelToSave] = useState<ParsedStream | null>(null);
  const [saveForm, setSaveForm] = useState({
    name: '',
    category: 'Tanzania',
    logo: '',
    stream_url: '',
    current_program: 'Live Broadcast',
    description: '',
  });
  const [savingToDb, setSavingToDb] = useState(false);

  // Library (Saved Playlist URLs) State
  const [libraryItems, setLibraryItems] = useState<LibraryPlaylist[]>(DEFAULT_LIBRARY_PLAYLISTS);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [editingLibraryItem, setEditingLibraryItem] = useState<LibraryPlaylist | null>(null);
  const [libraryForm, setLibraryForm] = useState({
    name: '',
    url: '',
    category: 'Multi-Category',
    region: 'Global',
    notes: '',
  });
  const [savingLibrary, setSavingLibrary] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const topSectionRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  // Fetch & auto-seed Library playlists from Supabase (with localStorage fallback)
  const fetchLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const { data, error } = await supabase
        .from('library')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        if (data.length === 0) {
          // Auto-seed default playlists into Supabase library table
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
            setLoadingLibrary(false);
            return;
          }
        } else {
          setLibraryItems(data as LibraryPlaylist[]);
          localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(data));
          setLoadingLibrary(false);
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
          setLoadingLibrary(false);
          return;
        }
      }
    } catch {}

    setLibraryItems(DEFAULT_LIBRARY_PLAYLISTS);
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(DEFAULT_LIBRARY_PLAYLISTS));
    setLoadingLibrary(false);
  };

  useEffect(() => {
    fetchLibrary();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('url');
      if (urlParam && urlParam.trim()) {
        setUrlInput(urlParam.trim());
        handleLoadUrl(urlParam.trim());
      }
    }
  }, []);

  const openAddLibraryModal = (prefillUrl = '') => {
    setEditingLibraryItem(null);
    let suggestedName = '';
    if (prefillUrl) {
      try {
        const u = new URL(prefillUrl);
        suggestedName = `Playlist (${u.hostname})`;
      } catch {
        suggestedName = 'Saved Playlist';
      }
    }
    setLibraryForm({
      name: suggestedName,
      url: prefillUrl,
      category: 'Multi-Category',
      region: 'Global',
      notes: '',
    });
    setLibraryModalOpen(true);
  };

  const openEditLibraryModal = (item: LibraryPlaylist) => {
    setEditingLibraryItem(item);
    setLibraryForm({
      name: item.name,
      url: item.url,
      category: item.category || 'Multi-Category',
      region: item.region || 'Global',
      notes: item.notes || '',
    });
    setLibraryModalOpen(true);
  };

  const handleSaveLibraryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryForm.name.trim() || !libraryForm.url.trim()) return;

    setSavingLibrary(true);
    const id =
      editingLibraryItem?.id ||
      'lib-' +
        libraryForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Math.floor(100 + Math.random() * 900);

    const payload: LibraryPlaylist = {
      id,
      name: libraryForm.name.trim(),
      url: libraryForm.url.trim(),
      category: libraryForm.category.trim() || 'Multi-Category',
      region: libraryForm.region.trim() || 'Global',
      notes: libraryForm.notes.trim(),
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

    setSavingLibrary(false);
    setLibraryModalOpen(false);
    setEditingLibraryItem(null);
  };

  const handleDeleteLibraryItem = async (id: string) => {
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

  const handleLoadFromLibrary = (item: LibraryPlaylist) => {
    setUrlInput(item.url);
    handleLoadUrl(item.url);
    if (topSectionRef.current) {
      topSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Setup HLS video player whenever activeStream changes (routed via /api/stream-proxy to bypass CORS)
  useEffect(() => {
    if (!activeStream || !videoRef.current) return;

    const video = videoRef.current;
    const rawUrl = activeStream.url;
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
        hlsInstance.on(Hls.Events.ERROR, (_event: any, data: any) => {
          if (data?.fatal) {
            setStreams((prev) =>
              prev.map((s) =>
                s.id === activeStream.id ? { ...s, health: 'OFFLINE' } : s
              )
            );
            setActiveStream((prev) =>
              prev && prev.id === activeStream.id ? { ...prev, health: 'OFFLINE' } : prev
            );
          }
        });
      } else {
        video.src = proxiedUrl;
        video.play().catch(() => {});
      }
    };

    initPlayer();

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [activeStream?.id, activeStream?.url]);

  const checkSingleStream = async (item: ParsedStream) => {
    setStreams((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, health: 'CHECKING' } : s))
    );

    try {
      const res = await fetch('/api/check-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url }),
      });
      const data = await res.json();
      const isOnline = Boolean(data?.alive);

      setStreams((prev) =>
        prev.map((s) =>
          s.id === item.id
            ? {
                ...s,
                health: isOnline ? 'ONLINE' : 'OFFLINE',
                statusCode: data?.status,
              }
            : s
        )
      );
    } catch {
      setStreams((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, health: 'OFFLINE' } : s))
      );
    }
  };

  const runBatchScan = async (listToScan: ParsedStream[]) => {
    if (listToScan.length === 0) return;
    stopScanRef.current = false;
    setScanning(true);

    const concurrency = 8;
    for (let i = 0; i < listToScan.length; i += concurrency) {
      if (stopScanRef.current) break;
      const batch = listToScan.slice(i, i + concurrency);
      await Promise.all(batch.map((item) => checkSingleStream(item)));
    }

    setScanning(false);
  };

  const handleStopScan = () => {
    stopScanRef.current = true;
    setScanning(false);
  };

  const handleLoadUrl = async (targetUrl?: string) => {
    const finalUrl = (targetUrl ?? urlInput).trim();
    if (!finalUrl) return;

    if (targetUrl) {
      setUrlInput(targetUrl);
    }

    stopScanRef.current = true;
    setLoadingPlaylist(true);

    try {
      const res = await fetch('/api/fetch-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        // Even if remote fetch had an issue, if it's a direct .m3u8 URL, allow testing it in player
        if (finalUrl.toLowerCase().includes('.m3u8')) {
          const singleItem: ParsedStream = {
            id: `stream-${Date.now()}-0`,
            name: 'Direct M3U8 Stream',
            logo: '',
            group: 'Direct Stream',
            url: finalUrl,
            health: 'OFFLINE',
          };
          setStreams([singleItem]);
          setActiveStream(singleItem);
          return;
        }
        alert(data.error || 'Could not load playlist URL');
        return;
      }

      const parsed = parseM3uContent(data.content || '', finalUrl);
      if (parsed.length === 0) {
        // Treat as single direct stream URL
        const single: ParsedStream = {
          id: `stream-${Date.now()}-0`,
          name: 'Direct Stream Link',
          logo: '',
          group: 'Direct Stream',
          url: finalUrl,
          health: 'ONLINE',
        };
        setStreams([single]);
        setActiveStream(single);
      } else {
        setStreams(parsed);
        setActiveStream(parsed[0]);
        setSelectedGroup('ALL');
        setHealthFilter('ALL');
        // Automatically start scanning channels
        runBatchScan(parsed);
      }
    } catch (err: any) {
      alert('Failed to load URL: ' + err.message);
    } finally {
      setLoadingPlaylist(false);
    }
  };

  const handleParseRaw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) return;

    stopScanRef.current = true;
    const parsed = parseM3uContent(rawInput.trim());
    if (parsed.length === 0) {
      alert('No valid #EXTINF or http(s) stream links found in pasted text.');
      return;
    }

    setStreams(parsed);
    setActiveStream(parsed[0]);
    setSelectedGroup('ALL');
    setHealthFilter('ALL');
    runBatchScan(parsed);
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const openAddToChannelsModal = (item: ParsedStream) => {
    setChannelToSave(item);
    setSaveForm({
      name: item.name,
      category: guessArenaCategory(item.group),
      logo: item.logo || '',
      stream_url: item.url,
      current_program: `${item.name} Live Broadcast`,
      description: `Live broadcast stream for ${item.name}.`,
    });
  };

  const handleSaveToCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelToSave) return;

    setSavingToDb(true);
    try {
      const channelId =
        saveForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Math.floor(100 + Math.random() * 900);

      const { error } = await supabase.from('channels').insert([
        {
          id: channelId,
          name: saveForm.name.trim(),
          category: saveForm.category,
          stream_url: saveForm.stream_url.trim(),
          logo: saveForm.logo.trim() || 'https://i.imgur.com/OmiVZ1u.png',
          current_program: saveForm.current_program.trim() || 'Live Broadcast',
          description: saveForm.description.trim() || '',
          is_live: true,
        },
      ]);

      if (error) throw error;

      setStreams((prev) =>
        prev.map((s) => (s.id === channelToSave.id ? { ...s, addedToCatalog: true } : s))
      );
      setChannelToSave(null);
    } catch (err: any) {
      alert('Failed to add channel to Supabase: ' + err.message);
    } finally {
      setSavingToDb(false);
    }
  };

  // Summary counts
  const totalStreams = streams.length;
  const onlineStreams = streams.filter((s) => s.health === 'ONLINE').length;
  const offlineStreams = streams.filter((s) => s.health === 'OFFLINE').length;
  const pendingStreams = streams.filter(
    (s) => s.health === 'IDLE' || s.health === 'CHECKING'
  ).length;

  const groups = Array.from(new Set(streams.map((s) => s.group).filter(Boolean)));

  const filteredStreams = streams.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.group.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase());

    const matchesHealth =
      healthFilter === 'ALL' ||
      (healthFilter === 'ONLINE' && s.health === 'ONLINE') ||
      (healthFilter === 'OFFLINE' && s.health === 'OFFLINE');

    const matchesGroup = selectedGroup === 'ALL' || s.group === selectedGroup;

    return matchesSearch && matchesHealth && matchesGroup;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Playlist
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            M3U & M3U8 stream playground — load playlists, test online/offline health, and add working streams to Channels.
          </p>
        </div>
      </div>

      {/* 2. Unified 70 / 30 Player, URL Loader & Stream/Playlist Info Section */}
      <div
        ref={topSectionRef}
        className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden grid grid-cols-1 lg:grid-cols-10"
      >
        {/* Left 70% (7 cols): Large Video Player + URL Input Bar Below */}
        <div className="lg:col-span-7 p-6 flex flex-col gap-4">
          {/* Large 16:9 Video Player */}
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative flex items-center justify-center shadow-xs">
            {activeStream ? (
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2.5 text-slate-500 p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <Tv className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-300">Stream Test Player</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Paste an M3U playlist or M3U8 stream link below to load and preview live playback.
                </p>
              </div>
            )}
          </div>

          {/* URL Input & Load Button Below Player */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLoadUrl();
            }}
            className="flex flex-col sm:flex-row gap-2.5 pt-1"
          >
            <input
              type="url"
              required
              placeholder="Paste M3U playlist link or direct M3U8 stream URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={loadingPlaylist}
              className="px-6 py-2.5 rounded-xl bg-[#e50914] hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingPlaylist ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load URL'
              )}
            </button>
            {urlInput.trim() && (
              <button
                type="button"
                onClick={() => openAddLibraryModal(urlInput.trim())}
                title="Save this playlist URL to your Library"
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save to Library
              </button>
            )}
          </form>
        </div>

        {/* Right 30% (3 cols): Stream / Playlist Info Panel */}
        <div className="lg:col-span-3 p-6 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-200/90 flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Source Info</h2>
              {streams.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-900 text-white">
                  {streams.length > 1 ? 'Playlist' : 'Direct Stream'}
                </span>
              )}
            </div>

            {streams.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
                <ListVideo className="w-7 h-7 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No URL loaded yet</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Load a link to inspect whether it is a single channel or a full playlist, along with categories and stream health.
                </p>
              </div>
            ) : streams.length === 1 && activeStream ? (
              /* Direct Single Channel Info */
              <div className="flex flex-col gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Channel Name
                  </span>
                  <p className="text-sm font-bold text-slate-900 truncate">{activeStream.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Category
                    </span>
                    <p className="font-semibold text-slate-800 truncate">
                      {activeStream.group || 'Direct Stream'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Health
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-bold ${
                        activeStream.health === 'ONLINE'
                          ? 'text-emerald-600'
                          : activeStream.health === 'OFFLINE'
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          activeStream.health === 'ONLINE'
                            ? 'bg-emerald-500 animate-pulse'
                            : activeStream.health === 'OFFLINE'
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      {activeStream.health}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Stream URL
                  </span>
                  <p className="font-mono text-[11px] text-slate-600 break-all line-clamp-2">
                    {activeStream.url}
                  </p>
                </div>
              </div>
            ) : (
              /* Full M3U Playlist Info */
              <div className="flex flex-col gap-3.5 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total</span>
                    <span className="text-lg font-black text-slate-900 mt-0.5">{totalStreams}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-emerald-600">Online</span>
                    <span className="text-lg font-black text-emerald-600 mt-0.5">
                      {onlineStreams}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-red-600">Offline</span>
                    <span className="text-lg font-black text-red-600 mt-0.5">{offlineStreams}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Categories Found ({groups.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {groups.map((grp) => (
                      <span
                        key={grp}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 text-[11px] font-semibold"
                      >
                        {grp}
                      </span>
                    ))}
                  </div>
                </div>

                {activeStream && (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Now Previewing
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          activeStream.health === 'ONLINE'
                            ? 'text-emerald-600'
                            : activeStream.health === 'OFFLINE'
                            ? 'text-red-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {activeStream.health}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                      {activeStream.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{activeStream.group}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeStream && (
            <button
              type="button"
              onClick={() => openAddToChannelsModal(activeStream)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Current Stream to Channels
            </button>
          )}
        </div>
      </div>

      {/* 3. Playlist Results Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-2xs">
        {loadingPlaylist ? (
          <div className="p-12 text-center flex flex-col items-center gap-3 text-slate-500 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            <span>Fetching and parsing playlist streams...</span>
          </div>
        ) : filteredStreams.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <ListVideo className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">
                {streams.length === 0 ? 'No playlist loaded yet' : 'No matching streams'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {streams.length === 0
                  ? 'Paste an M3U / M3U8 link above or click one of the Quick Preset playlists to load and test channels.'
                  : 'Try switching the Online/Offline filter or clearing your search.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50/60">
                <tr>
                  <th className="py-3.5 px-5">Channel</th>
                  <th className="py-3.5 px-4">Group</th>
                  <th className="py-3.5 px-4">Health</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStreams.map((item) => {
                  const isPlaying = activeStream?.id === item.id;
                  const isCopied = copiedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isPlaying ? 'bg-red-50/30' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Channel Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.logo ? (
                              <img
                                src={item.logo}
                                alt={item.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Tv className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 leading-tight truncate max-w-[260px]">
                              {item.name}
                            </p>
                            <p
                              className="text-xs text-slate-400 font-mono truncate max-w-[300px] mt-0.5"
                              title={item.url}
                            >
                              {item.url}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Group */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                          {item.group || 'General'}
                        </span>
                      </td>

                      {/* Health Badge */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => checkSingleStream(item)}
                          title="Click to re-check stream health"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            item.health === 'CHECKING'
                              ? 'bg-slate-50 text-slate-500 border-slate-200'
                              : item.health === 'ONLINE'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100/70'
                              : item.health === 'OFFLINE'
                              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100/70'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70'
                          }`}
                        >
                          {item.health === 'CHECKING' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>CHECKING</span>
                            </>
                          ) : item.health === 'ONLINE' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>ONLINE</span>
                            </>
                          ) : item.health === 'OFFLINE' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              <span>OFFLINE</span>
                            </>
                          ) : (
                            <span>TEST</span>
                          )}
                        </button>
                      </td>

                      {/* Actions: Preview, Copy URL, Add to Live Channels */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveStream(item)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isPlaying
                                ? 'bg-red-600 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            }`}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            {isPlaying ? 'Playing' : 'Preview'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyUrl(item.id, item.url)}
                            title="Copy M3U8 URL"
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {item.addedToCatalog ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-bold">
                              <Check className="w-3.5 h-3.5" />
                              Added
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAddToChannelsModal(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add
                            </button>
                          )}
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

      {/* 5. Add / Edit Library Playlist Modal (from Save to Library button) */}
      {libraryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingLibraryItem ? 'Edit Library Playlist' : 'Save Playlist to Library'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Store this M3U / M3U8 playlist link in your Library for hunting new and backup streams.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLibraryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLibraryItem} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Playlist Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. East Africa Backup Sports M3U"
                  value={libraryForm.name}
                  onChange={(e) => setLibraryForm({ ...libraryForm, name: e.target.value })}
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
                  value={libraryForm.url}
                  onChange={(e) => setLibraryForm({ ...libraryForm, url: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Category
                  </label>
                  <select
                    value={libraryForm.category}
                    onChange={(e) => setLibraryForm({ ...libraryForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  >
                    <option value="Multi-Category">Multi-Category</option>
                    <option value="Tanzania">Tanzania</option>
                    <option value="East Africa">East Africa</option>
                    <option value="Sports">Sports</option>
                    <option value="Football">Football</option>
                    <option value="Movies">Movies</option>
                    <option value="Cartoons">Cartoons</option>
                    <option value="Animals">Animals</option>
                    <option value="News">News</option>
                    <option value="Music">Music</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    placeholder="Global / Tanzania"
                    value={libraryForm.region}
                    onChange={(e) => setLibraryForm({ ...libraryForm, region: e.target.value })}
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
                  value={libraryForm.notes}
                  onChange={(e) => setLibraryForm({ ...libraryForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setLibraryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLibrary}
                  className="px-5 py-2 rounded-xl bg-[#e50914] hover:bg-red-700 text-white text-sm font-bold shadow-sm"
                >
                  {savingLibrary ? 'Saving...' : 'Save to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add to Live Channels Confirmation Modal */}
      {channelToSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add to Live Channels</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish this stream directly to your Supabase live channel catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChannelToSave(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveToCatalog} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Channel Name *
                </label>
                <input
                  type="text"
                  required
                  value={saveForm.name}
                  onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Category
                </label>
                <select
                  value={saveForm.category}
                  onChange={(e) => setSaveForm({ ...saveForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                >
                  {CHANNEL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  placeholder="https://i.imgur.com/..."
                  value={saveForm.logo}
                  onChange={(e) => setSaveForm({ ...saveForm, logo: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Stream URL (M3U8) *
                </label>
                <input
                  type="url"
                  required
                  value={saveForm.stream_url}
                  onChange={(e) => setSaveForm({ ...saveForm, stream_url: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setChannelToSave(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingToDb}
                  className="px-5 py-2 rounded-xl bg-[#e50914] hover:bg-red-700 text-white text-sm font-bold shadow-sm"
                >
                  {savingToDb ? 'Adding...' : 'Add to Live Channels'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

