'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CHANNELS, StreamChannel } from '@/data/channels';
import { createClient } from '@/lib/supabase/client';

export interface ActiveStream {
  id: string;
  title: string;
  name?: string;
  subtitle: string;
  streamUrl: string;
  embedUrl?: string;
  backupUrl?: string;
  isLive: boolean;
  logo?: string;
  category?: string;
  description?: string;
  viewers?: string;
  resolution?: string;
}

export interface SubscriptionData {
  isActive: boolean;
  expiresAt: number;
  activatedAt: number;
  phone: string;
  provider: string;
  planName: string;
  amount: number;
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
  progressPercent: number;
}

interface StreamContextType {
  currentStream: ActiveStream;
  channels: StreamChannel[];
  favorites: string[];
  subscription: SubscriptionData;
  timeRemaining: TimeRemaining;
  setCurrentStream: (stream: ActiveStream) => void;
  playChannel: (channel: StreamChannel) => void;
  playCustomUrl: (url: string, title?: string) => void;
  toggleFavorite: (channelId: string) => void;
  isFavorite: (channelId: string) => boolean;
  activateSubscription: (phone: string, provider: string, amount?: number, days?: number) => void;
  cancelSubscription: () => void;
  resetSubscriptionToNewUser: () => void;
}

const defaultStream: ActiveStream = {
  id: CHANNELS[0].id,
  title: CHANNELS[0].name,
  subtitle: CHANNELS[0].currentProgram,
  streamUrl: CHANNELS[0].streamUrl,
  backupUrl: CHANNELS[0].backupUrl,
  isLive: CHANNELS[0].isLive,
  logo: CHANNELS[0].logo,
  category: CHANNELS[0].category,
  description: CHANNELS[0].description,
  viewers: CHANNELS[0].viewers,
  resolution: CHANNELS[0].resolution,
};

// Initial default: First-time user starts with NO active subscription (unpaid)
const defaultSubscription: SubscriptionData = {
  isActive: false,
  activatedAt: 0,
  expiresAt: 0,
  phone: '',
  provider: 'M-Pesa',
  planName: 'ArenaX Pro',
  amount: 2000,
};

const StreamContext = createContext<StreamContextType | undefined>(undefined);

const mapRowToStreamChannel = (row: any): StreamChannel => {
  const staticMatch = CHANNELS.find((c) => c.id === row.id);
  const streamUrl = row.stream_url || staticMatch?.streamUrl || '';
  const embedUrl =
    row.embed_url ||
    (streamUrl.startsWith('/api/embed/') ? streamUrl : staticMatch?.embedUrl);

  return {
    id: row.id,
    name: row.name,
    category: (row.category || staticMatch?.category || 'General') as StreamChannel['category'],
    logo: row.logo || staticMatch?.logo || 'https://i.imgur.com/OmiVZ1u.png',
    currentProgram: row.current_program || staticMatch?.currentProgram || 'Live Broadcast',
    streamUrl,
    embedUrl,
    backupUrl: row.backup_url || staticMatch?.backupUrl || undefined,
    isLive: row.is_live ?? true,
    viewers: row.viewers || staticMatch?.viewers || '10K',
    description: row.description || staticMatch?.description || '',
    resolution: row.resolution || staticMatch?.resolution || '1080p FHD',
    country: row.country || staticMatch?.country || (row.category === 'Tanzania' ? 'TZ' : undefined),
  };
};

export const StreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStream, setCurrentStream] = useState<ActiveStream>(defaultStream);
  const [channels, setChannels] = useState<StreamChannel[]>(CHANNELS);
  const [favorites, setFavorites] = useState<string[]>(['tbc-1', 'bein-xtra-hd']);
  const [subscription, setSubscription] = useState<SubscriptionData>(defaultSubscription);
  const [now, setNow] = useState<number>(Date.now());
  const supabase = createClient();

  const fetchChannelsFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped = data
          .map(mapRowToStreamChannel)
          .filter((ch) => ch.isLive !== false);

        setChannels(mapped);

        if (mapped.length > 0) {
          setCurrentStream((prev) => {
            const updatedCurrent = mapped.find((c) => c.id === prev.id);
            if (updatedCurrent) {
              return {
                id: updatedCurrent.id,
                title: updatedCurrent.name,
                name: updatedCurrent.name,
                subtitle: updatedCurrent.currentProgram,
                streamUrl: updatedCurrent.streamUrl,
                embedUrl: updatedCurrent.embedUrl,
                backupUrl: updatedCurrent.backupUrl,
                isLive: updatedCurrent.isLive,
                logo: updatedCurrent.logo,
                category: updatedCurrent.category,
                description: updatedCurrent.description,
                viewers: updatedCurrent.viewers,
                resolution: updatedCurrent.resolution,
              };
            }
            // If current channel was turned offline or removed, switch to first online channel
            const first = mapped[0];
            return {
              id: first.id,
              title: first.name,
              name: first.name,
              subtitle: first.currentProgram,
              streamUrl: first.streamUrl,
              embedUrl: first.embedUrl,
              backupUrl: first.backupUrl,
              isLive: first.isLive,
              logo: first.logo,
              category: first.category,
              description: first.description,
              viewers: first.viewers,
              resolution: first.resolution,
            };
          });
        }
      }
    } catch (err) {
      console.error('Error loading channels from Supabase:', err);
    }
  }, []);

  useEffect(() => {
    fetchChannelsFromSupabase();

    // Realtime subscription so Admin Console changes reflect immediately on User Site
    const channelSub = supabase
      .channel('public:channels-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        () => {
          fetchChannelsFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
    };
  }, [fetchChannelsFromSupabase]);

  // Load saved favorites and subscription on mount
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('arenax_favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }

      // Clear legacy dummy test subscription from v1 if present
      localStorage.removeItem('arenax_subscription');

      const savedSub = localStorage.getItem('arenax_subscription_v2');
      if (savedSub) {
        const parsed: SubscriptionData = JSON.parse(savedSub);
        if (parsed.isActive && Date.now() < parsed.expiresAt) {
          setSubscription(parsed);
        } else {
          setSubscription({ ...parsed, isActive: false });
        }
      } else {
        setSubscription(defaultSubscription);
      }
    } catch (e) {
      console.error('Failed to load storage data', e);
    }
  }, []);

  // Tick timer every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);

      if (subscription.isActive && currentNow >= subscription.expiresAt) {
        setSubscription((prev) => {
          const expired = { ...prev, isActive: false };
          try {
            localStorage.setItem('arenax_subscription', JSON.stringify(expired));
          } catch (e) {}
          return expired;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [subscription.isActive, subscription.expiresAt]);

  // Calculate live countdown and progress percentage
  const calculateRemaining = (): TimeRemaining => {
    if (!subscription.isActive || now >= subscription.expiresAt) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
        formatted: 'Kifurushi Kimekwisha',
        progressPercent: 0,
      };
    }

    const diff = Math.max(0, subscription.expiresAt - now);
    const totalDuration = Math.max(1, subscription.expiresAt - subscription.activatedAt);
    const progressPercent = Math.min(100, Math.max(0, (diff / totalDuration) * 100));

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const formatted = `${days} Siku ${hours} Saa ${minutes} Dk ${seconds} Sek`;

    return {
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
      formatted,
      progressPercent,
    };
  };

  const activateSubscription = (
    phone: string,
    provider: string,
    amount = 2000,
    days = 30
  ) => {
    const activatedAt = Date.now();
    const expiresAt = activatedAt + days * 24 * 60 * 60 * 1000;
    const newSub: SubscriptionData = {
      isActive: true,
      activatedAt,
      expiresAt,
      phone,
      provider,
      planName: 'ArenaX Pro',
      amount,
    };

    setSubscription(newSub);
    try {
      localStorage.setItem('arenax_subscription_v2', JSON.stringify(newSub));
    } catch (e) {}
  };

  const cancelSubscription = () => {
    const expired: SubscriptionData = {
      ...subscription,
      isActive: false,
      expiresAt: Date.now() - 1000,
    };
    setSubscription(expired);
    try {
      localStorage.setItem('arenax_subscription_v2', JSON.stringify(expired));
    } catch (e) {}
  };

  const toggleFavorite = (channelId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId];
      try {
        localStorage.setItem('arenax_favorites', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const isFavorite = (channelId: string) => favorites.includes(channelId);

  const playChannel = (channel: StreamChannel) => {
    setCurrentStream({
      id: channel.id,
      title: channel.name,
      name: channel.name,
      subtitle: channel.currentProgram,
      streamUrl: channel.streamUrl,
      embedUrl: channel.embedUrl,
      backupUrl: channel.backupUrl,
      isLive: channel.isLive,
      logo: channel.logo,
      category: channel.category,
      description: channel.description,
      viewers: channel.viewers,
      resolution: channel.resolution,
    });
  };

  const playCustomUrl = (url: string, title?: string) => {
    setCurrentStream({
      id: `custom-${Date.now()}`,
      title: title || 'Custom Live Stream',
      subtitle: 'Direct HLS Stream',
      streamUrl: url,
      isLive: true,
      category: 'Live',
    });
  };

  const resetSubscriptionToNewUser = () => {
    setSubscription(defaultSubscription);
    try {
      localStorage.setItem('arenax_subscription_v2', JSON.stringify(defaultSubscription));
    } catch (e) {}
  };

  return (
    <StreamContext.Provider
      value={{
        currentStream,
        channels,
        favorites,
        subscription,
        timeRemaining: calculateRemaining(),
        setCurrentStream,
        playChannel,
        playCustomUrl,
        toggleFavorite,
        isFavorite,
        activateSubscription,
        cancelSubscription,
        resetSubscriptionToNewUser,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};

export const useStream = () => {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error('useStream must be used within a StreamProvider');
  }
  return context;
};
