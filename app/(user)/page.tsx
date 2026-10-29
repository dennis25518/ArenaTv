'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { LiveChannelsView } from '@/components/channels/LiveChannelsView';
import { MyListView } from '@/components/matches/MyListView';
import { ProfileView } from '@/components/profile/ProfileView';
import { LogoutDialog } from '@/components/modals/LogoutDialog';
import { SubscriptionModal } from '@/components/modals/SubscriptionModal';
import { User, PaymentMethod, Plan } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const [activeTab, setActiveTab] = useState('Channels');
  const [mounted, setMounted] = useState(false);
  const { user: authUser, profile, signOut } = useAuth();

  useEffect(() => {
    setMounted(true);
    const savedTab = localStorage.getItem('activeTab');
    const allowedTabs = ['Channels', 'My List', 'Profile'];

    if (savedTab && allowedTabs.includes(savedTab)) {
      setActiveTab(savedTab);
    } else {
      setActiveTab('Channels');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, mounted]);

  const user: User | null = authUser
    ? {
        name: profile?.name || authUser.email?.split('@')[0] || 'Mwanachama',
        email: profile?.email || authUser.email || '',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        isPremium: false,
      }
    : null;

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subStep, setSubStep] = useState<'plans' | 'payment'>('plans');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'Card',
      provider: 'Visa',
      last4: '4242',
      expiry: '12/26',
      isPrimary: true,
    },
    {
      id: '2',
      type: 'Mobile Money',
      provider: 'M-Pesa',
      last4: '8812',
      expiry: 'N/A',
      isPrimary: false,
    },
  ]);

  const handleLogin = () => {
    setActiveTab('Profile');
  };

  const handleLogout = async () => {
    await signOut();
    setShowLogoutDialog(false);
  };

  const handleSubscribe = () => {
    setSubStep('plans');
    setShowSubModal(true);
  };

  const handlePlanSelect = (plan: Plan) => {
    setSubStep('payment');
  };

  const handlePaymentConfirm = (method: PaymentMethod) => {
    setShowSubModal(false);
  };

  const handleAddPayment = (method: any) => {
    if (method) {
      setPaymentMethods([...paymentMethods, method]);
    } else {
      setActiveTab('Profile');
    }
  };

  const handleDeletePayment = (id: string) => {
    setPaymentMethods(paymentMethods.filter((p) => p.id !== id));
  };

  const handleEditPayment = (updated: PaymentMethod) => {
    setPaymentMethods(paymentMethods.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-main)]">
      <Header
        active={activeTab}
        setActive={setActiveTab}
        user={user}
        onLogin={handleLogin}
        onSubscribe={handleSubscribe}
        onLogoutClick={() => setShowLogoutDialog(true)}
      />

      <div className="flex flex-1 min-w-0">
        <Sidebar active={activeTab} setActive={setActiveTab} />

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full min-w-0">
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                {activeTab === 'Channels' ? (
                  <LiveChannelsView />
                ) : activeTab === 'My List' ? (
                  <MyListView
                    onExploreChannels={() => setActiveTab('Channels')}
                    onGoToLogin={() => setActiveTab('Profile')}
                  />
                ) : activeTab === 'Profile' ? (
                  <ProfileView />
                ) : (
                  <div className="premium-card p-20 flex flex-col items-center justify-center text-center gap-4 bg-white/50 backdrop-blur-sm">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <p className="text-4xl">⚙️</p>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{activeTab} section is coming soon</h3>
                      <p className="text-[var(--color-text-secondary)]">
                        We are bringing premium sports content to your screen.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('Channels')}
                      className="mt-4 px-6 py-2 bg-[var(--color-brand)] text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all"
                    >
                      Return to Channels
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <MobileNav active={activeTab} setActive={setActiveTab} />

      <LogoutDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleLogout}
      />

      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        step={subStep}
        onSelectPlan={handlePlanSelect}
        onConfirmPayment={handlePaymentConfirm}
        paymentMethods={paymentMethods}
        onAddPayment={handleAddPayment}
      />
    </div>
  );
}
