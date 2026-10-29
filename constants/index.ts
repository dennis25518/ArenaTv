import { Tv, List, MessageSquare, User } from 'lucide-react';

export const SIDEBAR_ITEMS = [
  { icon: Tv, label: 'Channels', href: '/channels' },
  { icon: List, label: 'My List', href: '/list' },
  { icon: MessageSquare, label: 'Community', href: '/community' },
  { icon: User, label: 'Profile', href: '/profile' },
];

export const QUALITIES = ['4K UHD', '1080p', '720p', '480p'];
export const SPEEDS = ['0.5x', '1.0x', '1.5x', '2.0x'];
