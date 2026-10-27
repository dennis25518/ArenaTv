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
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    toggleFavorite,
    subscription,
    activateSubscription
  } = useStream();
  const { isFullScreen, isFloating, toggleFullScreen, toggleFloating } = useVideoPlayer();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomUrlModal, setShowCustomUrlModal] = useState(false);
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customInputTitle, setCustomInputTitle] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const isBookmarked = isFavorite(currentStream.id);
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
        backBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(effectiveStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
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

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (!useProxy && !effectiveStreamUrl.startsWith('/api/stream-proxy')) {
                console.warn('Network error detected. Switching to stream proxy fallback...');
                setUseProxy(true);
              } else if (currentStream.backupUrl && currentStream.streamUrl !== currentStream.backupUrl) {
                console.warn('Proxy failed. Trying backup stream...');
                hls.loadSource(currentStream.backupUrl);
              } else {
                setStreamError('Unable to load stream. Network or CORS blocked.');
                setIsBuffering(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Media error detected. Recovering...');
              hls.recoverMediaError();
              break;
            default:
              setStreamError('Stream playback error encountered.');
              hls.destroy();
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
        <div className={`w-full ${isFullScreen ? 'h-full w-full' : isFloating ? 'w-full' : 'lg:w-[70%]'} flex flex-col`}>
          <div 
            className={`relative bg-black overflow-hidden group shadow-lg w-full
              ${isFullScreen ? 'h-full w-full rounded-none flex items-center justify-center' : isFloating ? 'aspect-video rounded-xl border border-white/20' : 'aspect-video rounded-2xl border border-gray-900/10'}`}
          >
            {/* HTML5 Video Tag with HLS OR Embedded Player */}
            {currentStream?.embedUrl ? (
              <iframe 
                key={currentStream.id}
                src={currentStream.embedUrl}
                title={currentStream.name}
                className="w-full h-full border-0 aspect-video rounded-2xl bg-black"
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

            {/* 30-Day Subscription Expired / Blocked Overlay */}
            <AnimatePresence>
              {!subscription.isActive && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 text-center z-50 gap-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-xl">
                    <Lock size={26} className="text-red-500" />
                  </div>
                  
                  <div className="flex flex-col gap-1.5 max-w-md">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest bg-red-950/80 border border-red-800/60 px-3 py-1 rounded-full">
                        🇹🇿 Kifurushi Kimekwisha
                      </span>
                    </div>
                    <h3 className="text-white text-lg sm:text-xl font-black tracking-tight">
                      Lipa TZS 2,000 Kuendelea Kutazama
                    </h3>
                    <p className="text-gray-400 text-xs font-medium leading-relaxed">
                      Kifurushi chako cha mwezi kimekwisha. Lipia TZS 2,000 kupitia M-Pesa, Tigo Pesa, Airtel Money au HaloPesa ufunguliwe channels zote bila kikomo kwa siku 30.
                    </p>
                  </div>

                  {/* Instant Unblock / Payment Action */}
                  <button
                    type="button"
                    onClick={() => activateSubscription('0754 888 222', 'M-Pesa', 2000, 30)}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Smartphone size={16} />
                    <span>Lipa TZS 2,000 (Washa Siku 30 Sasa)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* Big Center Play Button when Paused */}
            <AnimatePresence>
              {!currentStream?.embedUrl && !isPlaying && !isBuffering && !streamError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                >
                  <button 
                    onClick={togglePlay}
                    className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-[var(--color-brand)]/90 hover:bg-[var(--color-brand)] backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-110 pointer-events-auto"
                  >
                    <Play fill="white" size={24} className="ml-1" />
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
                      {showSettings && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-3 w-48 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl p-3 flex flex-col gap-3 z-20 text-white"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-brand)]">Quality</span>
                              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                                {qualityLevels.length > 0 ? (
                                  qualityLevels.map((lvl) => (
                                    <button 
                                      key={lvl.id}
                                      onClick={() => handleQualitySelect(lvl.id, lvl.label)}
                                      className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-white/10 text-xs font-medium transition-all"
                                    >
                                      <span className={currentQuality === lvl.label ? 'text-white font-bold' : 'text-gray-400'}>{lvl.label}</span>
                                      {currentQuality === lvl.label && <Check size={12} className="text-[var(--color-brand)]" />}
                                    </button>
                                  ))
                                ) : (
                                  ['Auto', '1080p', '720p', '480p'].map((q) => (
                                    <button 
                                      key={q}
                                      onClick={() => { setCurrentQuality(q); setShowSettings(false); }}
                                      className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-white/10 text-xs font-medium transition-all"
                                    >
                                      <span className={currentQuality === q ? 'text-white font-bold' : 'text-gray-400'}>{q}</span>
                                      {currentQuality === q && <Check size={12} className="text-[var(--color-brand)]" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="h-px bg-white/10" />

                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-brand)]">Speed</span>
                              <div className="flex flex-col gap-1">
                                {SPEEDS.slice(0, 4).map((s) => (
                                  <button 
                                    key={s}
                                    onClick={() => handleSpeedSelect(s)}
                                    className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-white/10 text-xs font-medium transition-all"
                                  >
                                    <span className={playbackSpeed === s ? 'text-white font-bold' : 'text-gray-400'}>{s}</span>
                                    {playbackSpeed === s && <Check size={12} className="text-[var(--color-brand)]" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        </>
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
        </div>

        {/* ======================================================== */}
        {/* RIGHT PART: 30% CHANNEL DETAILS & OPTIONS                */}
        {/* ======================================================== */}
        {!isFullScreen && (
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

                {/* (On Air) Badge on Right */}
                <div className="flex items-center gap-1.5 text-red-600 font-extrabold text-[11px] bg-red-50 border border-red-100 px-3 py-1 rounded-full shadow-xs tracking-wider shrink-0">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span>ON AIR</span>
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
            </div>

            {/* Bottom: (Views) icon & count on left, grey FPS in center, Like button without grey bg on right */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-main)] mt-auto">
              {/* Left: Views icon and count */}
              <div className="flex items-center gap-1.5 text-gray-700" title="Live Views">
                <Eye size={16} className="text-gray-400" />
                <span className="text-xs font-extrabold text-gray-800">{channelViewers} Views</span>
              </div>

              {/* Center: 60 FPS with grey icon, no green color */}
              <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold" title="Broadcast Frame Rate">
                <Gauge size={15} className="text-gray-400" />
                <span className="text-gray-600 font-extrabold">60 FPS</span>
              </div>

              {/* Right: Like button for selecting favourite (no grey background) */}
              <button 
                type="button"
                onClick={() => toggleFavorite(currentStream.id)}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none bg-transparent hover:bg-transparent ${
                  isBookmarked 
                    ? 'text-red-600' 
                    : 'text-gray-700 hover:text-red-600'
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
