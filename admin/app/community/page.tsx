'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Trash2, 
  ThumbsUp, 
  Pin, 
  Send, 
  Megaphone, 
  Tv, 
  Sparkles, 
  Flame, 
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  channel_room: 'general' | 'channel_requests' | 'feedback' | 'announcements';
  message: string;
  upvotes: number;
  status: 'pending' | 'under_review' | 'completed';
  is_admin: boolean;
  is_pinned: boolean;
  created_at: string;
}

const ROOM_OPTIONS = [
  { id: 'all', label: 'All Channels', icon: MessageSquare },
  { id: 'general', label: 'Live Lounge', icon: Flame },
  { id: 'channel_requests', label: 'Channel Requests', icon: Tv },
  { id: 'feedback', label: 'Feedback & Ideas', icon: Sparkles },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
];

export default function AdminCommunityPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [announcementText, setAnnouncementText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);

      if (selectedRoom !== 'all') {
        query = query.eq('channel_room', selectedRoom as 'general' | 'channel_requests' | 'feedback' | 'announcements');
      }

      const { data, error } = await query;
      if (!error && data) {
        setMessages(data as ChatMessage[]);
      }
    } catch (err) {
      console.error('Error fetching admin messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // Supabase Realtime Listener
    const channel = supabase
      .channel('admin_chat_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom]);

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const { error } = await supabase.from('chat_messages').delete().eq('id', id);
      if (!error) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setActionNotice('Message deleted successfully.');
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Could not delete message');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'under_review' | 'completed') => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ status: newStatus })
        .eq('id', id);

      if (!error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
        );
        setActionNotice(`Status updated to ${newStatus}`);
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Could not update status');
    }
  };

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim() || broadcasting) return;

    setBroadcasting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be signed in as an administrator to broadcast.');
      }

      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        user_name: 'ArenaTV Official',
        user_email: user.email || 'admin@arenax.tv',
        avatar_url: '/Assets/ArenaTV Logo.png',
        channel_room: 'announcements',
        message: announcementText.trim(),
        is_admin: true,
        is_pinned: true,
        status: 'completed',
        upvotes: 0,
      });

      if (error) throw error;

      setAnnouncementText('');
      setActionNotice('Announcement broadcasted to all users!');
      setTimeout(() => setActionNotice(null), 3500);
      loadMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to post announcement');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-red-600" />
            <span>Community & Channel Requests</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Moderate chat rooms, review and prioritize member channel requests, and broadcast official announcements.
          </p>
        </div>

        <button
          onClick={loadMessages}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={15} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Broadcast Announcement Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
          <Megaphone className="w-4 h-4 text-red-600" />
          <span>Broadcast Official Announcement</span>
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          This will be broadcasted to the user app's Announcements room with official verified ADMIN badges.
        </p>

        <form onSubmit={handleBroadcastAnnouncement} className="flex gap-2.5">
          <input
            type="text"
            required
            placeholder="e.g. Scheduled Maintenance tonight at 11:00 PM / SuperSport 3 is now live!"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={broadcasting || !announcementText.trim()}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            {broadcasting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            <span>Broadcast</span>
          </button>
        </form>
      </div>

      {/* Room Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {ROOM_OPTIONS.map((room) => {
          const Icon = room.icon;
          const isSelected = selectedRoom === room.id;
          return (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              <span>{room.label}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Feed Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Feed ({messages.length} messages)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={20} className="animate-spin text-red-600" />
            <span className="text-xs font-semibold">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No messages found in this room.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-xs shrink-0">
                    {msg.user_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{msg.user_name}</span>
                      {msg.user_email && (
                        <span className="text-[11px] text-slate-400">{msg.user_email}</span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        {msg.channel_room.replace('_', ' ')}
                      </span>
                      {msg.is_admin && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white">
                          ADMIN
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-800 mt-1 break-words">
                      {msg.message}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                      <span>{new Date(msg.created_at).toLocaleString()}</span>
                      {msg.channel_room === 'channel_requests' && (
                        <span className="flex items-center gap-1 font-bold text-blue-600">
                          <ThumbsUp size={12} /> {msg.upvotes || 0} Upvotes
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Status Control */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {msg.channel_room === 'channel_requests' && (
                    <select
                      value={msg.status || 'pending'}
                      onChange={(e) => handleUpdateStatus(msg.id, e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-red-600"
                    >
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="completed">Added / Completed</option>
                    </select>
                  )}

                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    title="Delete message"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
