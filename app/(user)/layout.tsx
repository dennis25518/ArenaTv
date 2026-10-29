'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { StreamProvider } from '@/context/StreamContext';
import { FloatingMiniPlayer } from '@/components/player/FloatingMiniPlayer';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <StreamProvider>
        {children}
        <FloatingMiniPlayer />
      </StreamProvider>
    </AuthProvider>
  );
}
