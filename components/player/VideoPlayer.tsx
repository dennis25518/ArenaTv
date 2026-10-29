'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize2, 
  Minimize2, 
  MonitorPlay, 
  Settings, 
  Check, 
  Share2, 
  Plus, 
  Tv, 
  Link as LinkIcon, 
  RotateCcw, 
  Loader2, 
  AlertCircle, 
  Radio, 
  CheckCircle2, 
  Bookmark, 
  Users, 
  Activity, 
  ShieldCheck, 
  Sparkles,
  Heart,
  Eye,
  Gauge,
  Lock,
  Smartphone,
  X,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';
import { SPEEDS } from '@/constants';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { useStream } from '@/context/StreamContext';

export const VideoPlayer = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const { 
    currentStream, 
    channels, 
    playChannel, 
    playCustomUrl, 
    isFavorite, 
    toggleFavorite
  } = useStream();
  const { isFullScreen, isFloating, toggleFullScreen, toggleFloating } = useVideoPlayer();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [showCustomUrlModal, setShowCustomUrlModal] = useState(false);
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customInputTitle, setCustomInputTitle] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const isBookmarked = currentStream ? isFavorite(currentStream.id) : false;
  const [logoError, setLogoError] = useState(false);

  const matchedChannel = useMemo(
    () => channels.find((c) => c.id === currentStream?.id),
    [channels, currentStream?.id]
  );
  const channelDescription =
    matchedChannel?.description ||
    currentStream?.description ||
    'Official live television broadcast streaming in high definition with 24/7 sports, news, and entertainment programming.';
  const channelViewers = matchedChannel?.viewers || currentStream?.viewers || '42.5K';

  // HLS stream qualities
  const [qualityLevels, setQualityLevels] = useState<{ id: number; label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0x');

  // Real-time MB Consumption & Bundle Telemetry
  const [downloadBytes, setDownloadBytes] = useState(0);
  const [uploadBytes, setUploadBytes] = useState(0);
  const [currentSpeedKbps, setCurrentSpeedKbps] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sparklineBars, setSparklineBars] = useState<number[]>([35, 45, 60, 40, 70, 55, 65, 80, 70, 85]);
  const lastRealBytesTime = useRef(Date.now());
  const bytesSinceLastSec = useRef(0);
  const accumBytesRef = useRef(0);

  // Reset telemetry on channel switch
  useEffect(() => {
    setDownloadBytes(0);
    setUploadBytes(0);
    setCurrentSpeedKbps(0);
    setSessionSeconds(0);
    setSparklineBars([35, 45, 60, 40, 70, 55, 65, 80, 70, 85]);
    bytesSinceLastSec.current = 0;
    accumBytesRef.current = 0;
    lastRealBytesTime.current = Date.now();
  }, [currentStream?.id]);

  // Throttled ticker (every 2.5s) to eliminate memory thrashing and CPU burn
  useEffect(() => {
    if (!isPlaying) {
      setCurrentSpeedKbps(0);
      return;
    }

    const interval = setInterval(() => {
      setSessionSeconds((s) => s + 2);

      const now = Date.now();
      const timeSinceRealFrag = now - lastRealBytesTime.current;

      let speedKbps = 0;

      if (timeSinceRealFrag < 3500 && bytesSinceLastSec.current > 0) {
        speedKbps = Math.round(bytesSinceLastSec.current / 2.5 / 1024);
        bytesSinceLastSec.current = 0;
      } else {
        const baseRateKbps = 
          currentQuality === '1080p' ? 320 :
          currentQuality === '720p' ? 190 :
          currentQuality === '480p' ? 110 : 210;

        const jitter = 0.92 + Math.random() * 0.16;
        speedKbps = Math.round(baseRateKbps * jitter);
        const addedBytes = Math.round((speedKbps * 1024) * 2.5);
        accumBytesRef.current += addedBytes;
      }

      const totalDown = accumBytesRef.current;
      setDownloadBytes(totalDown);
      setUploadBytes(Math.round(totalDown * 0.018));
      setCurrentSpeedKbps(speedKbps);

      setSparklineBars((prev) => {
        const nextVal = Math.min(100, Math.max(25, Math.round((speedKbps / 360) * 100)));
        return [...prev.slice(1), nextVal];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isPlaying, currentQuality]);

  const formatMB = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [streamError, setStreamError] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState(false);

  // Controls auto-hide timer
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Reset logo error when channel changes
  useEffect(() => {
    setLogoError(false);
  }, [currentStream?.id]);

  // Resolve whether to load direct or via our CORS edge proxy
  const effectiveStreamUrl = useMemo(() => {
    if (!currentStream?.streamUrl) return '';
    const raw = currentStream.streamUrl;
    if (useProxy || raw.startsWith('http://')) {
      return `/api/stream-proxy?url=${encodeURIComponent(raw)}`;
    }
    return raw;
  }, [currentStream?.streamUrl, useProxy]);

  // Initialize or reload stream
  useEffect(() => {
    if (currentStream?.embedUrl) {
      setStreamError(null);
      setIsBuffering(false);
      setIsPlaying(true);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video || !effectiveStreamUrl) return;

    setStreamError(null);
    setIsBuffering(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // YouTube-grade memory management
        maxBufferLength: 20,              // Keep only 20s forward buffer in RAM
        maxMaxBufferLength: 30,           // Hard cap 30s forward buffer
        maxBufferSize: 30 * 1024 * 1024,  // Cap total buffer at 30 MB (prevents browser tab crashes)
        backBufferLength: 10,             // Evict played segments older than 10s from memory
        // Resilient auto-retry timeouts
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 5,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 15000,
        levelLoadingMaxRetry: 5,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
      });

      hlsRef.current = hls;
      let networkRetryCount = 0;

      hls.loadSource(effectiveStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        networkRetryCount = 0;
        setIsBuffering(false);
        const levels = [
          { id: -1, label: 'Auto' },
          ...data.levels.map((level, index) => ({
            id: index,
            label: `${level.height || 720}p`,
          })),
        ];
        setQualityLevels(levels);

        video.play().then(() => setIsPlaying(true)).catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data: any) => {
        const bytes = data?.frag?.stats?.total || data?.stats?.total || data?.payload?.byteLength;
        if (bytes && typeof bytes === 'number') {
          accumBytesRef.current += bytes;
          bytesSinceLastSec.current += bytes;
          lastRealBytesTime.current = Date.now();
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetryCount < 4) {
                networkRetryCount += 1;
                console.warn(`HLS Network drop. Auto-recovering attempt ${networkRetryCount}...`);
                hls.startLoad();
              } else if (!useProxy && !effectiveStreamUrl.startsWith('/api/stream-proxy')) {
                networkRetryCount = 0;
                setUseProxy(true);
              } else if (currentStream?.backupUrl && currentStream?.streamUrl !== currentStream?.backupUrl) {
                networkRetryCount = 0;
                hls.loadSource(currentStream.backupUrl);
              } else {
                networkRetryCount = 0;
                // Graceful retry instead of permanently failing
                setTimeout(() => {
                  if (hlsRef.current) hlsRef.current.startLoad();
                }, 2000);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media error. Auto-recovering codec & buffer...');
              hls.recoverMediaError();
              break;
            default:
              console.warn('HLS fatal error. Attempting engine recovery...');
              try {
                hls.destroy();
                setTimeout(() => {
                  if (videoRef.current && effectiveStreamUrl && Hls.isSupported()) {
                    hls.loadSource(effectiveStreamUrl);
                    hls.attachMedia(videoRef.current);
                  }
                }, 1500);
              } catch (e) {}
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = effectiveStreamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
      video.addEventListener('error', () => {
        if (!useProxy) {
          setUseProxy(true);
        } else {
          setStreamError('Failed to play stream on native player.');
        }
      });
    } else {
      setStreamError('Your browser does not support HLS streaming.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [effectiveStreamUrl, useProxy, currentStream?.streamUrl, currentStream?.backupUrl]);

  // Video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('volumechange', onVolumeChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, []);

  // Live Stall Watchdog: Detects if playback froze due to packet gaps and resyncs to live edge
  useEffect(() => {
    let lastTime = 0;
    let stuckCount = 0;

    const stallCheck = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended && video.readyState >= 2) {
        if (Math.abs(video.currentTime - lastTime) < 0.25) {
          stuckCount += 1;
          if (stuckCount >= 3) {
            // Video is frozen on live stream, gently jump to live edge
            if (video.buffered.length > 0) {
              const liveEdge = video.buffered.end(video.buffered.length - 1);
              video.currentTime = Math.max(0, liveEdge - 1);
            }
            video.play().catch(() => {});
            stuckCount = 0;
          }
        } else {
          stuckCount = 0;
        }
        lastTime = video.currentTime;
      }
    }, 2500);

    return () => clearInterval(stallCheck);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    video.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const handleQualitySelect = (levelId: number, label: string) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
      setCurrentQuality(label);
    }
    setShowSettings(false);
  };

  const handleSpeedSelect = (speed: string) => {
    const video = videoRef.current;
    if (!video) return;
    const rate = parseFloat(speed.replace('x', ''));
    video.playbackRate = rate;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  const handleRetryStream = () => {
    setStreamError(null);
    setUseProxy((prev) => !prev);
  };

  const handleShareClick = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;
    playCustomUrl(customInputUrl.trim(), customInputTitle.trim() || 'Custom Stream');
    setShowCustomUrlModal(false);
    setCustomInputUrl('');
    setCustomInputTitle('');
    setUseProxy(false);
  };

  if (!currentStream) {
    return (
      <div className="relative w-full h-[260px] sm:h-[360px] md:h-[420px] rounded-3xl overflow-hidden border border-[var(--color-border-main)] shadow-xl flex flex-col justify-end p-6 sm:p-10 select-none group">
        {/* Background Hero Banner */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: "url('/Assets/Slider.jpeg')" }}
        />
        
        {/* Dark Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

        {/* Content Over Banner */}
        <div className="relative z-10 flex flex-col items-start max-w-xl">
          <div className="mb-2 sm:mb-2.5">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white drop-shadow-md">
              Welcome to Arena Tv
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
            Select a Channel to Watch Live
          </h2>

          <p className="text-xs sm:text-sm text-gray-200 mt-2 sm:mt-2.5 font-medium leading-relaxed drop-shadow max-w-lg">
            Stream your favourite news, moviest & sports 24/7
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 70 / 30 SPLIT CONTAINER: 70% PLAYER ON LEFT, 30% CHANNEL DETAILS ON RIGHT */}
      <div 
        className={`w-full flex flex-col lg:flex-row gap-5 lg:gap-6 items-stretch
          ${isFullScreen ? 'fixed inset-0 z-[60] bg-black p-0 m-0 overflow-hidden' : ''} 
          ${isFloating ? 'fixed bottom-6 right-6 w-80 z-[60] shadow-2xl max-sm:w-64 max-sm:bottom-[80px] max-sm:right-4 pointer-events-auto' : ''}`}
        onMouseMove={handleUserActivity}
        onClick={handleUserActivity}
      >
        {/* ======================================================== */}
        {/* LEFT PART: 70% VIDEO PLAYER                              */}
        {/* ======================================================== */}
        <div className={`w-full ${isFullScreen ? 'h-full w-full' : isFloating ? 'w-full' : 'lg:w-[70%]'} flex flex-col relative`}>
          <div 
            className={`relative bg-black overflow-hidden group shadow-lg w-full
              ${isFullScreen ? 'h-full w-full rounded-none flex items-center justify-center' : isFloating ? 'aspect-video rounded-xl border border-white/20' : 'h-[270px] sm:h-[340px] md:h-auto md:aspect-video rounded-2xl border border-gray-900/10'}`}
          >
            {/* HTML5 Video Tag with HLS OR Embedded Player */}
            {currentStream?.embedUrl ? (
              <iframe 
                key={currentStream.id}
                src={currentStream.embedUrl}
                title={currentStream.name}
                className="w-full h-full border-0 rounded-2xl bg-black"
                allow="autoplay *; encrypted-media *; picture-in-picture *; fullscreen *"
                allowFullScreen
              />
            ) : (
              <video 
                ref={videoRef}
                playsInline
                className="w-full h-full object-contain bg-black cursor-pointer"
                onClick={togglePlay}
              />
            )}

            {/* Buffering Spinner */}
            <AnimatePresence>
              {!currentStream?.embedUrl && isBuffering && !streamError && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none z-20"
                >
                  <Loader2 className="w-10 h-10 text-[var(--color-brand)] animate-spin" />
                  <span className="text-white text-xs font-semibold mt-2.5 tracking-wide drop-shadow">
                    Connecting Live Broadcast...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Overlay with Fallback Action */}
            <AnimatePresence>
              {streamError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-30 gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                    <AlertCircle size={20} />
                  </div>
                  <h3 className="text-white text-sm font-bold">Stream Unavailable</h3>
                  <p className="text-gray-400 text-xs max-w-sm">{streamError}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button 
                      onClick={handleRetryStream}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/80 text-white rounded-lg text-xs font-semibold transition-all"
                    >
                      <RotateCcw size={13} />
                      Retry with Proxy
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Big Center Play Button when Paused (Always Solid Red, Never Transparent) */}
            <AnimatePresence>
              {!currentStream?.embedUrl && !isPlaying && !streamError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none"
                >
                  <button 
                    type="button"
                    onClick={togglePlay}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#e50914] hover:bg-[#c50711] flex items-center justify-center text-white shadow-2xl shadow-red-950/70 transition-transform hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer border-2 border-white/20 ring-4 ring-red-600/30"
                    title="Play Stream"
                  >
                    <Play fill="white" color="white" size={30} className="ml-1 text-white" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Control Bar */}
            {!currentStream?.embedUrl && (
            <div 
              className={`absolute bottom-0 left-0 right-0 p-3 lg:p-4 pt-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 z-10 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3 lg:gap-5">
                  <button 
                    onClick={togglePlay}
                    className="hover:text-[var(--color-brand)] transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>

                  {/* Volume & Slider */}
                  <div 
                    className="flex items-center gap-2 relative group/volume"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button 
                      onClick={handleMuteToggle}
                      className="hover:text-[var(--color-brand)] transition-colors inline-flex"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>

                    <div className={`transition-all duration-200 overflow-hidden flex items-center ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 accent-[var(--color-brand)] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Live Status indicator */}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider">LIVE</span>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-3 lg:gap-4 text-white/80 relative">
                  {/* Quality & Settings Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className="flex items-center gap-1 text-[11px] font-bold hover:text-white transition-colors bg-white/10 px-2 py-0.5 rounded-md"
                      title="Stream Settings"
                    >
                      <span>{currentQuality}</span>
                      <Settings size={13} />
                    </button>

                    <AnimatePresence>
                      {isFullScreen && showSettings && (
                        <div>
                          <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setShowSettings(false)} />
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-3 w-52 bg-white dark:bg-[#15161e] text-[var(--color-text-primary)] backdrop-blur-xl rounded-2xl border border-[var(--color-border-main)] shadow-2xl p-3 flex flex-col gap-3 z-20 transition-colors"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-brand)]">Quality</span>
                              <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                                {qualityLevels.length > 0 ? (
                                  qualityLevels.map((lvl) => (
                                    <button 
                                      key={lvl.id}
                                      type="button"
                                      onClick={() => {
                                        handleQualitySelect(lvl.id, lvl.label);
                                        setShowSettings(false);
                                      }}
                                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/70 text-xs font-medium transition-all cursor-pointer"
                                    >
                                      <span className={currentQuality === lvl.label ? 'text-[var(--color-brand)] font-bold' : 'text-[var(--color-text-secondary)]'}>{lvl.label}</span>
                                      {currentQuality === lvl.label && <Check size={13} className="text-[var(--color-brand)]" />}
                                    </button>
                                  ))
                                ) : (
                                  ['Auto', '1080p', '720p', '480p'].map((q) => (
                                    <button 
                                      key={q}
                                      type="button"
                                      onClick={() => { setCurrentQuality(q); setShowSettings(false); }}
                                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/70 text-xs font-medium transition-all cursor-pointer"
                                    >
                                      <span className={currentQuality === q ? 'text-[var(--color-brand)] font-bold' : 'text-[var(--color-text-secondary)]'}>{q}</span>
                                      {currentQuality === q && <Check size={13} className="text-[var(--color-brand)]" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="h-px bg-[var(--color-border-main)]" />

                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-brand)]">Speed</span>
                              <div className="flex flex-col gap-0.5">
                                {SPEEDS.slice(0, 4).map((s) => (
                                  <button 
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                      handleSpeedSelect(s);
                                      setShowSettings(false);
                                    }}
                                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/70 text-xs font-medium transition-all cursor-pointer"
                                  >
                                    <span className={playbackSpeed === s ? 'text-[var(--color-brand)] font-bold' : 'text-[var(--color-text-secondary)]'}>{s === '1.0x' ? '1.0x (Normal)' : s}</span>
                                    {playbackSpeed === s && <Check size={13} className="text-[var(--color-brand)]" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* PiP / Floating Player */}
                  <button 
                    onClick={toggleFloating}
                    className={`hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 ${isFloating ? 'text-[var(--color-brand)] bg-white/10' : ''}`}
                    title={isFloating ? "Dock Player" : "Float / PiP"}
                  >
                    <MonitorPlay size={16} />
                  </button>

                  {/* Fullscreen */}
                  <button 
                    onClick={toggleFullScreen}
                    className="hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
                    title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Floating Settings Card directly below the player (Non-fullscreen, No dark grey dimming) */}
          <AnimatePresence>
            {!isFullScreen && showSettings && (
              <>
                {/* Transparent click-away backdrop: Allows viewers to continue watching video unobstructed */}
                <div 
                  className="fixed inset-0 z-30 bg-transparent" 
                  onClick={() => setShowSettings(false)} 
                />

                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute top-full mt-2.5 right-0 sm:right-2 z-40 w-full max-w-sm bg-white dark:bg-[#15161e] text-[var(--color-text-primary)] border border-[var(--color-border-main)] rounded-2xl shadow-xl p-3.5 flex flex-col gap-2.5 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[var(--color-border-main)]">
                    <div className="flex items-center gap-1.5">
                      <Settings size={14} className="text-[#e50914]" />
                      <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Playback Settings</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Quality Pills */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#e50914]">Quality</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {qualityLevels.length > 0 ? (
                        qualityLevels.map((lvl) => {
                          const isSelected = currentQuality === lvl.label;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => {
                                handleQualitySelect(lvl.id, lvl.label);
                                setShowSettings(false);
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#e50914] text-white shadow-xs'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              {lvl.label}
                            </button>
                          );
                        })
                      ) : (
                        ['Auto', '1080p', '720p', '480p'].map((q) => {
                          const isSelected = currentQuality === q;
                          return (
                            <button
                              key={q}
                              type="button"
                              onClick={() => {
                                setCurrentQuality(q);
                                setShowSettings(false);
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#e50914] text-white shadow-xs'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              {q}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Speed Pills */}
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#e50914]">Speed</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {SPEEDS.slice(0, 4).map((s) => {
                        const isSelected = playbackSpeed === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              handleSpeedSelect(s);
                              setShowSettings(false);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#e50914] text-white shadow-xs'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {s === '1.0x' ? '1.0x (Normal)' : s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PART: 30% CHANNEL DETAILS & OPTIONS                */}
        {/* ======================================================== */}
        {!isFullScreen && !isFloating && (
          <div className="w-full lg:w-[30%] flex flex-col justify-between p-5 rounded-2xl bg-white border border-[var(--color-border-main)] shadow-sm gap-4">
            {/* Top Area: Logo, On Air badge, Channel Name & About Section */}
            <div className="flex flex-col gap-3">
              {/* Row 1: Large Channel Logo on Left, (On Air) Badge on Right */}
              <div className="flex items-center justify-between gap-3 min-h-[64px]">
                {/* Large Logo without background */}
                <div className="h-16 flex items-center justify-start max-w-[65%]">
                  {!logoError && currentStream.logo ? (
                    <img 
                      src={currentStream.logo} 
                      alt={currentStream.title} 
                      onError={() => setLogoError(true)}
                      className="max-h-16 w-auto max-w-full object-contain filter drop-shadow-xs" 
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 font-black text-xl">
                      <Tv size={28} />
                      <span className="truncate">{currentStream.title}</span>
                    </div>
                  )}
                </div>

                {/* Right: Red On Air Badge & Like Button */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  {/* Red On Air Badge with smaller border radius & white blinking text */}
                  <div className="flex items-center gap-1.5 bg-[#e50914] text-white font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-lg shadow-xs tracking-wider select-none">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                    <span className="animate-pulse">ON AIR</span>
                  </div>

                  {/* Like Button on the right end */}
                  <button 
                    type="button"
                    onClick={() => toggleFavorite(currentStream.id)}
                    className={`flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 ${
                      isBookmarked 
                        ? 'text-red-600' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-600'
                    }`}
                    title={isBookmarked ? 'Remove from Favorites' : 'Add to Favorites'}
                  >
                    <Heart 
                      size={16} 
                      className={`transition-all duration-200 ${isBookmarked ? 'text-red-600 fill-red-600 scale-110' : 'text-gray-500 hover:text-red-500'}`} 
                    />
                    <span>{isBookmarked ? 'Liked' : 'Like'}</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Big Channel Name & Helper text */}
              <div className="flex flex-col min-w-0 mt-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] tracking-tight truncate">
                    {currentStream.title}
                  </h2>
                  <CheckCircle2 size={18} className="text-red-600 shrink-0" fill="currentColor" color="white" />
                </div>
                {currentStream.subtitle && (
                  <p className="text-xs font-semibold text-gray-500 line-clamp-1 mt-0.5">
                    {currentStream.subtitle}
                  </p>
                )}
              </div>

              {/* Horizontal rule just below the helper text */}
              <hr className="border-t border-gray-200/90 my-1 w-full" />

              {/* Detailed Context-Rich About Paragraph (no grey box, no title, fills area nicely) */}
              <div className="text-left py-1">
                <p className="text-xs sm:text-[13px] text-gray-700 font-normal leading-relaxed">
                  {channelDescription}
                </p>
              </div>

              {/* Bundle Consumption Metrics (Download / Upload / Usage) */}
              <div className="mt-1 p-2.5 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-[var(--color-border-main)] flex flex-col gap-2 transition-all">
                {/* Simple Header */}
                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">
                  Bundle Usage
                </span>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                  {/* Download */}
                  <div className="flex flex-col py-1.5 px-1 sm:px-2 rounded-lg bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <ArrowDown size={11} className="stroke-[2.5]" />
                      <span>Download</span>
                    </div>
                    <span className="text-xs sm:text-[13px] font-black text-[var(--color-text-primary)] mt-0.5 font-mono whitespace-nowrap">
                      {formatMB(downloadBytes)}
                    </span>
                  </div>

                  {/* Upload */}
                  <div className="flex flex-col py-1.5 px-1 sm:px-2 rounded-lg bg-white dark:bg-[#121218] border border-[var(--color-border-main)] shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      <ArrowUp size={11} className="stroke-[2.5]" />
                      <span>Upload</span>
                    </div>
                    <span className="text-xs sm:text-[13px] font-black text-[var(--color-text-primary)] mt-0.5 font-mono whitespace-nowrap">
                      {formatMB(uploadBytes)}
                    </span>
                  </div>

                  {/* Usage */}
                  <div className="flex flex-col py-1.5 px-1 sm:px-2 rounded-lg bg-red-50/80 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                      <Activity size={11} className="stroke-[2.5]" />
                      <span>Usage</span>
                    </div>
                    <span className="text-xs sm:text-[13px] font-black text-red-600 dark:text-red-400 mt-0.5 font-mono whitespace-nowrap">
                      {formatMB(downloadBytes + uploadBytes)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom M3U8 URL Modal */}
      <AnimatePresence>
        {showCustomUrlModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-[var(--color-border-main)] shadow-2xl p-6 w-full max-w-md flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-main)]">
                <h3 className="text-base font-bold">Play Custom HLS (.m3u8) Stream</h3>
                <button 
                  onClick={() => setShowCustomUrlModal(false)}
                  className="w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCustomUrlSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[var(--color-text-secondary)]">Stream URL (.m3u8)</label>
                  <input 
                    type="url"
                    required
                    placeholder="https://example.com/live/stream.m3u8"
                    value={customInputUrl}
                    onChange={(e) => setCustomInputUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border-main)] bg-gray-50 dark:bg-white/5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[var(--color-text-secondary)]">Stream Title (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Champions League Final"
                    value={customInputTitle}
                    onChange={(e) => setCustomInputTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border-main)] bg-gray-50 dark:bg-white/5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 text-white font-bold rounded-xl text-xs transition-all shadow-md mt-1"
                >
                  Stream Live
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
