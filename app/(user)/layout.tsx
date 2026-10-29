'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { StreamProvider } from '@/context/StreamContext';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <StreamProvider>{children}</StreamProvider>
    </AuthProvider>
  );
}
