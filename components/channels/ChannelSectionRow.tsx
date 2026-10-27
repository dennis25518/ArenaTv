'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StreamChannel } from '@/data/channels';
import { ChannelIconTile } from './ChannelIconTile';

interface ChannelSectionRowProps {
  title: string;
  badge?: string;
  channels: StreamChannel[];
  currentStreamId: string;
  onSelectChannel: (channel: StreamChannel) => void;
}

export const ChannelSectionRow: React.FC<ChannelSectionRowProps> = ({
  title,
  badge,
  channels,
  currentStreamId,
  onSelectChannel,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* SECTION NAME ROW: Title on left, Circular Scroll Controls on right */}
      <div className="flex items-center justify-between px-0.5">
        {/* Section title with thick red underline below the word */}
        <div className="flex flex-col items-start">
          <h2 className="text-base lg:text-lg font-black text-[var(--color-text-primary)] tracking-tight">
            {title}
          </h2>
          <div className="w-full h-[3.5px] bg-red-600 rounded-full mt-0.5" />
        </div>

        {/* Circular Scroll Buttons on the Right Side */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label={`Scroll ${title} left`}
            className="w-8 h-8 rounded-full border border-[var(--color-border-main)] bg-white hover:bg-gray-100 hover:border-gray-400 text-gray-700 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer select-none"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label={`Scroll ${title} right`}
            className="w-8 h-8 rounded-full border border-[var(--color-border-main)] bg-white hover:bg-gray-100 hover:border-gray-400 text-gray-700 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer select-none"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* HORIZONTAL CHANNEL FLOW: Same compact card size as My List / Favorites, hidden scrollbar */}
      <div
        ref={scrollRef}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto scroll-smooth no-scrollbar py-1 select-none"
      >
        {channels.map((channel) => (
          <div key={channel.id} className="w-[170px] sm:w-[180px] shrink-0">
            <ChannelIconTile
              channel={channel}
              isPlaying={currentStreamId === channel.id}
              onSelect={onSelectChannel}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
