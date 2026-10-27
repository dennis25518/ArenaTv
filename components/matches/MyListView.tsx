'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { useStream } from '@/context/StreamContext';
import { ChannelIconTile } from '@/components/channels/ChannelIconTile';
import { StreamChannel } from '@/data/channels';

interface MyListViewProps {
  onExploreChannels?: () => void;
}

export const MyListView: React.FC<MyListViewProps> = ({ onExploreChannels }) => {
  const { channels, isFavorite, playChannel, currentStream } = useStream();

  // Filter channels marked as favorite
  const favoriteChannels = channels.filter((ch) => isFavorite(ch.id));

  const handleSelectChannel = (channel: StreamChannel) => {
    playChannel(channel);
    if (onExploreChannels) {
      onExploreChannels();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shadow-xs">
            <Heart size={18} className="text-red-600 fill-red-600" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg lg:text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              My Favorites
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
              {favoriteChannels.length} {favoriteChannels.length === 1 ? 'Channel' : 'Channels'}
            </span>
          </div>
        </div>
      </div>

      {/* CHANNELS GRID ONLY */}
      {favoriteChannels.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {favoriteChannels.map((channel) => (
            <div key={channel.id} className="w-full">
              <ChannelIconTile
                channel={channel}
                isPlaying={currentStream.id === channel.id}
                onSelect={handleSelectChannel}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full py-20 px-6 rounded-2xl bg-white border border-[var(--color-border-main)] flex flex-col items-center justify-center text-center gap-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shadow-sm">
            <Heart size={32} className="text-red-500" />
          </div>
          <div className="max-w-md flex flex-col gap-1.5">
            <h3 className="text-base font-bold text-gray-900">
              No Favorite Channels Yet
            </h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Tap the <Heart size={13} className="inline text-red-600 fill-red-600 align-text-bottom mx-0.5" /> heart icon on any channel card to add it to your watchlist for instant access.
            </p>
          </div>
          {onExploreChannels && (
            <button
              type="button"
              onClick={onExploreChannels}
              className="mt-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              Browse All Channels
            </button>
          )}
        </div>
      )}
    </div>
  );
};
