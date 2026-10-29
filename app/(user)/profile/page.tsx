'use client';

import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ProfileView } from '@/components/profile/ProfileView';

export default function ProfilePage() {
  return (
    <DashboardShell activePage="Profile">
      <ProfileView />
    </DashboardShell>
  );
}

