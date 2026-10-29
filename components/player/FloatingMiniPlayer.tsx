'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  X, 
  Tv, 
  Loader2, 
  Radio 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';
import { useStream } from '@/context/StreamContext';

export const FloatingMiniPlayer: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentStream, setCurrentStream } = useStream();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Auto-float only when moving away from the channels page
  const shouldShow = useMemo(() => {
    if (!currentStream) return false;
    if (!pathname) return false;
    // Don't float on channels page (full player is already docked there)
    if (pathname === '/channels') return false;
    // Don't show on pure auth pages
    if (
      pathname.startsWith('/signin') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/signout')
    ) {
      return false;
    }
    return true;
  }, [currentStream, pathname]);

  const effectiveStreamUrl = useMemo(() => {
    if (!currentStream?.streamUrl) return '';
    const raw = currentStream.streamUrl;
    if (useProxy || raw.startsWith('http://')) {
      return `/api/stream-proxy?url=${encodeURIComponent(raw)}`;
    }
    return raw;
  }, [currentStream?.streamUrl, useProxy]);

  // HLS stream attach when shouldShow is active
  useEffect(() => {
    if (!shouldShow || !currentStream) return;

    if (currentStream.embedUrl) {
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

    setIsBuffering(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 15,
        maxMaxBufferLength: 25,
        maxBufferSize: 20 * 1024 * 1024, // 20 MB cap for mini-player
        backBufferLength: 5,              // Drop old video immediately
        manifestLoadingTimeOut: 15000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
      });

      hlsRef.current = hls;
      let networkRetryCount = 0;
      hls.loadSource(effectiveStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        networkRetryCount = 0;
        setIsBuffering(false);
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay with sound might be blocked, retry muted
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetryCount < 3) {
                networkRetryCount += 1;
                hls.startLoad();
              } else if (!useProxy && !effectiveStreamUrl.startsWith('/api/stream-proxy')) {
                networkRetryCount = 0;
                setUseProxy(true);
              } else if (currentStream.backupUrl && currentStream.streamUrl !== currentStream.backupUrl) {
                networkRetryCount = 0;
                hls.loadSource(currentStream.backupUrl);
              } else {
                networkRetryCount = 0;
                setIsBuffering(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              try {
                hls.destroy();
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
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [shouldShow, effectiveStreamUrl, currentStream?.embedUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleReturnToChannels = () => {
    router.push('/channels');
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentStream(null);
  };

  if (!shouldShow || !currentStream) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="floating-mini-player"
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 30 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleReturnToChannels}
        className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-[95] w-72 sm:w-80 md:w-92 aspect-video bg-[#0d0d12] rounded-2xl overflow-hidden border border-white/20 shadow-2xl shadow-black/80 ring-1 ring-red-600/30 cursor-pointer group select-none transition-all duration-200 hover:shadow-red-600/20 hover:border-red-500/40"
        title="Click to return to full player on Channels"
      >
        {/* Video / Embed Content */}
        {currentStream.embedUrl ? (
          <iframe
            key={currentStream.id}
            src={currentStream.embedUrl}
            title={currentStream.name || currentStream.title}
            className="w-full h-full border-0 bg-black pointer-events-none"
            allow="autoplay *; encrypted-media *; picture-in-picture *"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted={isMuted}
            className="w-full h-full object-cover bg-black"
          />
        )}

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        )}

        {/* Top Header Overlay: Channel Brand & Close Button */}
        <div className="absolute top-0 inset-x-0 h-10 px-2.5 pt-1.5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-auto">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {!logoError && currentStream.logo ? (
              <img
                src={currentStream.logo}
                alt={currentStream.title}
                onError={() => setLogoError(true)}
                className="h-5 w-auto max-w-[32px] object-contain drop-shadow"
              />
            ) : (
              <Tv className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span className="text-[11px] font-black text-white truncate drop-shadow">
              {currentStream.title || currentStream.name}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-600/90 text-white text-[9px] font-black uppercase tracking-wider shrink-0 animate-pulse">
              <Radio size={9} />
              Live
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              title="Close player"
              className="w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 hover:border-red-500"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Hover Action Overlay: YouTube Style */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 flex flex-col justify-between p-2.5 pointer-events-none ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Invisible top spacer for header */}
          <div className="h-6" />

          {/* Center: Play/Pause button */}
          {!currentStream.embedUrl && (
            <div className="flex items-center justify-center pointer-events-auto">
              <button
                type="button"
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-red-600/95 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
              </button>
            </div>
          )}

          {/* Bottom Bar: Return to Channels / Mute Controls */}
          <div className="flex items-center justify-between text-white pointer-events-auto">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] text-white/90 font-medium truncate max-w-[140px] drop-shadow">
                {currentStream.subtitle || 'Click to expand'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!currentStream.embedUrl && (
                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-white/90 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReturnToChannels();
                }}
                title="Expand to Full Player"
                className="px-2 py-1 rounded-md bg-white/20 hover:bg-red-600 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Maximize2 size={12} />
                <span>Expand</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

