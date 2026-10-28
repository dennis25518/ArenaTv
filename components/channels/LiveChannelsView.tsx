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

  // 1. Local Channels (Tanzanian channels only)
  const localChannels = channels.filter(
    (ch) => ch.country === 'TZ' || ch.category === 'Tanzania'
  );

  // 2. Movies & Cinema Channels
  const movieChannels = channels.filter((ch) => ch.category === 'Movies');

  // 3. Cartoons & Kids Animation Channels
  const cartoonChannels = channels.filter((ch) => ch.category === 'Cartoons');

  // 4. Animals, Wildlife & Nature Channels
  const animalChannels = channels.filter((ch) => ch.category === 'Animals');

  // 5. Sports Channels
  const sportsChannels = channels.filter((ch) => ch.category === 'Sports' || ch.category === 'Football');

  // 6. Major 24/7 World News Channels
  const newsChannels = channels.filter((ch) => ch.category === 'News');

  // 7. Music & Youth Entertainment Channels
  const musicChannels = channels.filter((ch) => ch.category === 'Music');

  return (
    <div className="w-full flex flex-col gap-8">
      {/* 1. TOP LIVE PLAYER */}
      <section className="w-full">
        <VideoPlayer />
      </section>

      {/* 2. LOCAL CHANNELS */}
      <section className="w-full">
        <ChannelSectionRow
          title="Local"
          channels={localChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>

      {/* 3. MOVIES & CINEMA */}
      <section className="w-full">
        <ChannelSectionRow
          title="Movies"
          channels={movieChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>

      {/* 4. CARTOONS & KIDS */}
      <section className="w-full">
        <ChannelSectionRow
          title="Cartoons"
          channels={cartoonChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>

      {/* 5. ANIMALS & NATURE */}
      <section className="w-full">
        <ChannelSectionRow
          title="Animals & Nature"
          channels={animalChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>

      {/* 6. SPORTS CHANNELS */}
      <section className="w-full">
        <ChannelSectionRow
          title="Sports"
          channels={sportsChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>

      {/* 7. WORLD NEWS CHANNELS */}
      <section className="w-full">
        <ChannelSectionRow
          title="News"
          channels={newsChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>

      {/* 8. MUSIC CHANNELS */}
      <section className="w-full">
        <ChannelSectionRow
          title="Music"
          channels={musicChannels}
          currentStreamId={currentStream.id}
          onSelectChannel={handleSelectChannel}
        />
      </section>
    </div>
  );
};

