'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Tv, 
  Send, 
  ThumbsUp, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Megaphone, 
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Flame,
  User as UserIcon,
  Smile,
  RefreshCw,
  X,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useStream } from '@/context/StreamContext';

export interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  avatar_url: string | null;
  channel_room: 'general' | 'channel_requests' | 'feedback' | 'announcements';
  message: string;
  upvotes: number;
  status: 'pending' | 'under_review' | 'completed';
  is_admin: boolean;
  is_pinned: boolean;
  created_at: string;
}

const ROOM_TABS = [
  {
    id: 'general',
    label: 'Live Lounge',
    icon: Flame,
    description: 'Chat with other members, discuss match moments, and share live reactions.',
    color: 'from-orange-500/20 to-red-600/10 text-orange-500 border-orange-500/30'
  },
  {
    id: 'channel_requests',
    label: 'Channel Requests',
    icon: Tv,
    description: 'Request channels you want added to ArenaTV. Upvote requests from other members!',
    color: 'from-blue-500/20 to-cyan-600/10 text-blue-500 border-blue-500/30'
  },
  {
    id: 'feedback',
    label: 'Feedback & Ideas',
    icon: Sparkles,
    description: 'Suggest improvements, report playback bugs, or tell us how to make ArenaTV better.',
    color: 'from-emerald-500/20 to-teal-600/10 text-emerald-500 border-emerald-500/30'
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: Megaphone,
    description: 'Official announcements, scheduled match schedules, and platform updates.',
    color: 'from-red-500/20 to-pink-600/10 text-red-500 border-red-500/30'
  },
] as const;

export const CommunityView: React.FC = () => {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { subscription } = useStream();
  const supabase = createClient();

  const [activeRoom, setActiveRoom] = useState<'general' | 'channel_requests' | 'feedback' | 'announcements'>('general');
  const [hasChosenRoom, setHasChosenRoom] = useState<boolean>(false);
  const [showRoomModal, setShowRoomModal] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [rateLimitErr, setRateLimitErr] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSentTimeRef = useRef<number>(0);

  const isAdminUser = profile?.role === 'admin' || user?.user_metadata?.role === 'admin';

  // Fetch messages when room changes
  useEffect(() => {
    let isMounted = true;

    async function loadRoomMessages() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('channel_room', activeRoom)
          .order('created_at', { ascending: activeRoom === 'channel_requests' ? false : true })
          .limit(100);

        if (!error && data && isMounted) {
          setMessages(data as ChatMessage[]);
        }
      } catch (err) {
        console.warn('Error loading chat messages:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function loadUserUpvotes() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('chat_upvotes')
          .select('message_id')
          .eq('user_id', user.id);

        if (!error && data && isMounted) {
          const upvotedIds = new Set(data.map((r: any) => r.message_id));
          setUserUpvotes(upvotedIds);
        }
      } catch (err) {
        console.warn('Error loading upvotes:', err);
      }
    }

    loadRoomMessages();
    loadUserUpvotes();

    // Supabase Realtime Listener
    const channel = supabase
      .channel(`chat_${activeRoom}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_room=eq.${activeRoom}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return activeRoom === 'channel_requests' ? [newMsg, ...prev] : [...prev, newMsg];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ChatMessage;
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setMessages((prev) => prev.filter((m) => m.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeRoom, user?.id]);

  // Scroll to bottom in lounge and announcements
  useEffect(() => {
    if (activeRoom !== 'channel_requests') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeRoom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    if (!user) {
      setRateLimitErr('Please sign in to participate in the community chat.');
      return;
    }

    // Rate limiter: 1 message every 2.5 seconds
    const now = Date.now();
    if (now - lastSentTimeRef.current < 2500) {
      setRateLimitErr('Slow down! Please wait 2 seconds before posting again.');
      setTimeout(() => setRateLimitErr(null), 3000);
      return;
    }

    // Announcements only allowed by admins
    if (activeRoom === 'announcements' && !isAdminUser) {
      setRateLimitErr('Only ArenaTV verified staff can broadcast announcements.');
      setTimeout(() => setRateLimitErr(null), 3500);
      return;
    }

    setSending(true);
    setRateLimitErr(null);

    const messageContent = inputText.trim();
    const currentName = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Member';
    const currentAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentName)}`;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          user_name: currentName,
          user_email: user.email,
          avatar_url: currentAvatar,
          channel_room: activeRoom,
          message: messageContent,
          is_admin: isAdminUser,
          status: 'pending',
          upvotes: 0,
        })
        .select()
        .single();

      if (error) throw error;

      lastSentTimeRef.current = Date.now();
      setInputText('');

      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return activeRoom === 'channel_requests' ? [data, ...prev] : [...prev, data];
        });
      }
    } catch (err: any) {
      console.error('Failed to post message:', err);
      setRateLimitErr(err.message || 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleToggleUpvote = async (msg: ChatMessage) => {
    if (!user) {
      setRateLimitErr('Please sign in to upvote channel requests.');
      setTimeout(() => setRateLimitErr(null), 3000);
      return;
    }

    const hasUpvoted = userUpvotes.has(msg.id);
    const newUpvotes = new Set(userUpvotes);

    if (hasUpvoted) {
      newUpvotes.delete(msg.id);
      setUserUpvotes(newUpvotes);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, upvotes: Math.max(0, m.upvotes - 1) } : m))
      );

      await supabase.from('chat_upvotes').delete().match({ message_id: msg.id, user_id: user.id });
      await supabase
        .from('chat_messages')
        .update({ upvotes: Math.max(0, msg.upvotes - 1) })
        .eq('id', msg.id);
    } else {
      newUpvotes.add(msg.id);
      setUserUpvotes(newUpvotes);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, upvotes: m.upvotes + 1 } : m))
      );

      await supabase.from('chat_upvotes').insert({ message_id: msg.id, user_id: user.id });
      await supabase
        .from('chat_messages')
        .update({ upvotes: msg.upvotes + 1 })
        .eq('id', msg.id);
    }
  };

  const currentRoomMeta = ROOM_TABS.find((t) => t.id === activeRoom) || ROOM_TABS[0];
  const CurrentIcon = currentRoomMeta.icon;

  return (
    <div className="flex flex-col gap-5 w-full max-w-6xl mx-auto relative">
      {/* 2x2 Room Selection Modal / Popup */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#12131a] rounded-3xl border border-[var(--color-border-main)] shadow-2xl p-5 sm:p-7 flex flex-col gap-4 sm:gap-5 my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                if (!hasChosenRoom) {
                  // User hasn't chosen any room yet and cancelled -> navigate back to previous page
                  router.back();
                } else {
                  setShowRoomModal(false);
                }
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
                  ArenaTV Community
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
                Choose a Room to Enter
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Pick a room to join the conversation. You can change rooms anytime.
              </p>
            </div>

            {/* Strict 2x2 Grid Columns on both mobile & desktop */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {ROOM_TABS.map((tab) => {
                const Icon = tab.icon;
                const isCurrent = activeRoom === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveRoom(tab.id as any);
                      setHasChosenRoom(true);
                      setShowRoomModal(false);
                    }}
                    className={`flex flex-col text-left p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.02] ${
                      isCurrent && hasChosenRoom
                        ? 'border-red-600 bg-red-50/60 dark:bg-red-950/20 shadow-md ring-1 ring-red-600'
                        : 'border-[var(--color-border-main)] bg-gray-50/70 dark:bg-[#181922] hover:border-red-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <Icon size={16} />
                      </div>
                      <ArrowRight size={14} className="text-gray-400 group-hover:text-red-600 transition-colors" />
                    </div>

                    <span className="text-xs sm:text-sm font-extrabold text-[var(--color-text-primary)] line-clamp-1">
                      {tab.label}
                    </span>
                    <span className="text-[10px] sm:text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2 leading-tight">
                      {tab.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Unified Card: Room Header + Chat Feed */}
      <div className="rounded-3xl bg-white dark:bg-[#12131a] border border-[var(--color-border-main)] shadow-sm flex flex-col h-[640px] sm:h-[700px] overflow-hidden">
        {/* Room Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center shrink-0">
              <CurrentIcon size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-[var(--color-text-primary)] truncate">
                {currentRoomMeta.label}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5 truncate max-w-xl">
                {currentRoomMeta.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRoomModal(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-600/20 transition-all cursor-pointer shrink-0"
            title="Switch room"
          >
            <span>Change Room</span>
            <ChevronDown size={15} />
          </button>
        </div>

        {/* Faint Gray Horizontal Rule */}
        <div className="h-px w-full bg-gray-200/80 dark:bg-gray-800/80 shrink-0" />

        {/* Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
              <RefreshCw size={24} className="animate-spin text-red-600" />
              <span className="text-xs font-semibold">Connecting to live feed...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <currentRoomMeta.icon size={26} />
              </div>
              <div>
                <p className="font-bold text-[var(--color-text-primary)] text-sm sm:text-base">
                  No posts yet in {currentRoomMeta.label}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-sm">
                  Be the first to share your thoughts, suggest a channel, or join the conversation!
                </p>
              </div>
            </div>
          ) : activeRoom === 'channel_requests' ? (
            /* Channel Requests List (Grid with Upvoting) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {messages.map((msg) => {
                const hasVoted = userUpvotes.has(msg.id);

                return (
                  <div
                    key={msg.id}
                    className="p-4 rounded-2xl bg-gray-50/80 dark:bg-[#181922] border border-[var(--color-border-main)] flex items-start justify-between gap-3 transition-all hover:border-gray-400/30"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <img
                        src={msg.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
                        alt={msg.user_name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-300 dark:border-gray-700"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                            {msg.user_name}
                          </span>
                          {msg.is_admin && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-600 text-white uppercase">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-1 break-words">
                          {msg.message}
                        </p>
                        <span className="text-[10px] text-[var(--color-text-secondary)] mt-1.5 block">
                          {new Date(msg.created_at).toLocaleDateString()} at{' '}
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Upvote Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleUpvote(msg)}
                      className={`flex flex-col items-center justify-center min-w-[54px] py-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                        hasVoted
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-[var(--color-text-secondary)] hover:text-blue-600 border-[var(--color-border-main)]'
                      }`}
                      title={hasVoted ? 'Remove upvote' : 'Upvote this channel request'}
                    >
                      <ThumbsUp size={16} className={hasVoted ? 'fill-current' : ''} />
                      <span className="text-xs font-extrabold mt-0.5">{msg.upvotes || 0}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Standard Live Chat Flow */
            messages.map((msg) => {
              const isOwnMessage = user?.id === msg.user_id;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 max-w-2xl ${
                    isOwnMessage ? 'self-end flex-row-reverse' : 'self-start'
                  }`}
                >
                  <img
                    src={msg.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
                    alt={msg.user_name}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-300 dark:border-gray-700 mt-1"
                  />

                  <div
                    className={`flex flex-col ${
                      isOwnMessage ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                        {isOwnMessage ? 'You' : msg.user_name}
                      </span>
                      {msg.is_admin && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-600 text-white uppercase tracking-wider flex items-center gap-0.5">
                          <ShieldCheck size={10} /> ADMIN
                        </span>
                      )}
                      <span className="text-[9px] text-gray-400">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed break-words shadow-2xs ${
                        isOwnMessage
                          ? 'bg-red-600 text-white rounded-tr-xs'
                          : msg.is_admin
                          ? 'bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-900/50 rounded-tl-xs'
                          : 'bg-gray-100 dark:bg-[#1b1c26] text-[var(--color-text-primary)] rounded-tl-xs border border-transparent dark:border-gray-800/60'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-gray-50/80 dark:bg-[#0e0f14] border-t border-[var(--color-border-main)]">
          {rateLimitErr && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{rateLimitErr}</span>
            </div>
          )}

          {activeRoom === 'announcements' && !isAdminUser ? (
            <div className="py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-center text-xs text-[var(--color-text-secondary)] font-medium">
              🔒 Announcements are broadcast-only by verified ArenaTV administrators.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeRoom === 'channel_requests'
                    ? 'Enter channel name you would like added (e.g. SuperSport Premier League)...'
                    : activeRoom === 'feedback'
                    ? 'Write feedback or suggest a feature...'
                    : 'Type a message to the community...'
                }
                maxLength={400}
                className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-[#181922] border border-[var(--color-border-main)] text-xs sm:text-sm text-[var(--color-text-primary)] placeholder-gray-400 focus:outline-none focus:border-red-600 transition-colors shadow-2xs"
              />

              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="px-4 sm:px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {sending ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={15} />
                    <span className="hidden sm:inline">
                      {activeRoom === 'channel_requests' ? 'Request' : 'Send'}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

