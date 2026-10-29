'use client';

import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { LiveChannelsView } from '@/components/channels/LiveChannelsView';

export default function ChannelsPage() {
  return (
    <DashboardShell activePage="Channels">
      <LiveChannelsView />
    </DashboardShell>
  );
}

