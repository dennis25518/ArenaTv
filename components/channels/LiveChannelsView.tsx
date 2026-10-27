'use client';

import React from 'react';
import { useStream } from '@/context/StreamContext';
import { StreamChannel } from '@/data/channels';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { ChannelSectionRow } from './ChannelSectionRow';

export const LiveChannelsView: React.FC = () => {
  const { currentStream, channels, playChannel } = useStream();

  const handleSelectChannel = (channel: StreamChannel) => {
    playChannel(channel);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. First top flow: Local Channels (Tanzanian channels only)
  const localChannels = channels.filter(
    (ch) => ch.country === 'TZ' || ch.category === 'Tanzania'
  );

  // 2. Second flow: Major 24/7 World News Channels
  const newsChannels = channels.filter((ch) => ch.category === 'News');

  // 3. Third flow: Music & Youth Entertainment Channels
  const musicChannels = channels.filter((ch) => ch.category === 'Music');

  // 4. Fourth flow: International Sports Channels
  const sportsChannels = channels.filter(
    (ch) => ch.category === 'Sports' || (ch.category !== 'News' && ch.category !== 'Music' && ch.country !== 'TZ' && ch.category !== 'Tanzania')
  );

  return (
    <div className="w-full flex flex-col gap-8">
      {/* 1. TOP LIVE PLAYER (70 / 30 SPLIT) */}
      <section className="w-full">
        <VideoPlayer />
      </section>

      {/* 2. FIRST TOP FLOW: LOCAL CHANNELS ONLY */}
      <section className="w-full">
        <ChannelSectionRow
          title="Local"
          channels={localChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>

      {/* 3. SECOND FLOW: WORLD NEWS CHANNELS */}
      <section className="w-full">
        <ChannelSectionRow
          title="News"
          channels={newsChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>

      {/* 4. THIRD FLOW: MUSIC CHANNELS */}
      <section className="w-full">
        <ChannelSectionRow
          title="Music"
          channels={musicChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>

      {/* 5. FOURTH FLOW: SPORTS CHANNELS */}
      <section className="w-full">
        <ChannelSectionRow
          title="Sports"
          channels={sportsChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>
    </div>
  );
};
