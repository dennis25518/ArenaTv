'use client';

import React, { useState } from 'react';
import { Tv, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { StreamChannel } from '@/data/channels';
import { useStream } from '@/context/StreamContext';

interface ChannelIconTileProps {
  channel: StreamChannel;
  isPlaying: boolean;
  onSelect: (channel: StreamChannel) => void;
  size?: 'normal' | 'large' | 'compact';
}

export const ChannelIconTile: React.FC<ChannelIconTileProps> = ({
  channel,
  isPlaying,
  onSelect,
}) => {
  const { isFavorite, toggleFavorite } = useStream();
  const [imgError, setImgError] = useState(false);

  const favorited = isFavorite(channel.id);

  // Generate clean initials for fallback
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase();
    return (parts[0] + ' ' + (parts[1] || '')).slice(0, 5).toUpperCase();
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(channel.id);
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={() => onSelect(channel)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(channel);
        }
      }}
      className={`w-full group relative flex flex-col items-center justify-between rounded-2xl transition-all text-center select-none overflow-hidden p-3 min-h-[125px] bg-white cursor-pointer ${
        isPlaying
          ? 'border-2 border-red-600 shadow-sm'
          : 'border border-[var(--color-border-main)] hover:border-gray-400/60 hover:shadow-xs'
      }`}
    >
      {/* TOP HEADER: (Live/on air) on the LEFT, Favorite Heart on the RIGHT */}
      <div className="w-full flex items-center justify-between text-[10px] font-bold">
        {/* Left: Live / On Air status */}
        {isPlaying ? (
          <div className="flex items-center gap-1.5 text-red-600 font-extrabold text-[10px] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            <span>ON AIR</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-gray-500 font-bold text-[10px] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>LIVE</span>
          </div>
        )}

        {/* Right: Favorite Heart Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className="p-1 -mr-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer select-none"
          title={favorited ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Heart
            size={16}
            className={`transition-all duration-200 ${
              favorited
                ? 'text-red-600 fill-red-600 scale-110 drop-shadow-xs'
                : 'text-gray-400 hover:text-red-500 hover:scale-105'
            }`}
          />
        </button>
      </div>

      {/* CENTERPIECE: Clean Real Channel Logo */}
      <div className="my-auto py-1 flex items-center justify-center w-full">
        <div className="w-32 h-14 sm:w-36 sm:h-14 flex items-center justify-center transition-transform duration-200 group-hover:scale-102">
          {!imgError && channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="max-h-full max-w-full object-contain filter drop-shadow-xs transition-all"
            />
          ) : (
            <div className="w-16 h-12 rounded-xl bg-gray-100 text-gray-700 flex flex-col items-center justify-center border border-gray-200">
              <Tv size={15} className="text-gray-500 mb-0.5" />
              <span className="text-[10px] font-black tracking-tight leading-none px-1 text-center truncate max-w-full">
                {getInitials(channel.name)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM FOOTER: Channel Name & Resolution/Viewers */}
      <div className="w-full flex flex-col items-center gap-0.5 pt-0.5">
        <h3
          className={`text-xs font-bold truncate max-w-full transition-colors ${
            isPlaying ? 'text-red-600 font-extrabold' : 'text-[var(--color-text-primary)] group-hover:text-red-600'
          }`}
        >
          {channel.name}
        </h3>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-secondary)] font-medium">
          <span>{channel.resolution || '720p HD'}</span>
          {channel.viewers && (
            <>
              <span>•</span>
              <span>{channel.viewers}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
