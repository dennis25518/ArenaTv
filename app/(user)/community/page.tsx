'use client';

import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { CommunityView } from '@/components/community/CommunityView';

export default function CommunityPage() {
  return (
    <DashboardShell activePage="Community">
      <CommunityView />
    </DashboardShell>
  );
}

