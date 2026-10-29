'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { MyListView } from '@/components/matches/MyListView';

export default function MyListPage() {
  const router = useRouter();

  return (
    <DashboardShell activePage="My List">
      <MyListView
        onExploreChannels={() => router.push('/channels')}
        onGoToLogin={() => router.push('/signin')}
      />
    </DashboardShell>
  );
}

