'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Tv, 
  CreditCard, 
  LayoutDashboard, 
  LogOut, 
  ExternalLink, 
  ShieldCheck, 
  Menu, 
  X,
  Radio,
  ListVideo,
  FolderOpen,
  Users,
  User,
  Activity,
  Sun,
  Moon,
  MessageSquare
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState<string>('Admin');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const supabase = createClient();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        let formattedName = 'Isdory Dennis';
        const rawName =
          profile?.name?.trim() ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          '';

        if (rawName) {
          formattedName = rawName;
        } else if (user.email) {
          const prefix = user.email.split('@')[0].replace(/[0-9]+/g, '').toLowerCase();
          if (prefix === 'isdorydennis') {
            formattedName = 'Isdory Dennis';
          } else if (prefix) {
            formattedName = prefix
              .split(/[._-]+/)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
          }
        }

        setAdminName(formattedName);
      }
    }
    checkUser();

    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('arenax_admin_theme') as 'light' | 'dark' | null;
      if (savedTheme === 'dark') {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      } else {
        setTheme('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arenax_admin_theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const generalNavItems = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
    { name: 'Community', href: '/community', icon: MessageSquare },
    { name: 'Activity', href: '/activity', icon: Activity },
  ];

  const technicalNavItems = [
    { name: 'Channels', href: '/channels', icon: Tv },
    { name: 'Playlist', href: '/playlist', icon: ListVideo },
    { name: 'Library', href: '/library', icon: FolderOpen },
  ];

  const navGroups = [
    { label: 'General', items: generalNavItems },
    { label: 'Technical', items: technicalNavItems },
  ];

  return (
    <html lang="en">
      <head>
        <title>ArenaX Control - Back-Office Portal</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/Assets/Red TV Favicon.png" />
      </head>
      <body className="bg-slate-50/60 text-slate-900 min-h-screen">
        {isLoginPage ? (
          <div>{children}</div>
        ) : (
          <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-red-600 selection:text-white">
            {/* Sidebar Desktop - Divided into 3 parts: Top, Middle, Bottom (No scrolling needed) */}
            <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/90 bg-white p-5 shrink-0 justify-between overflow-hidden shadow-2xs">
              <div className="flex flex-col">
                {/* 1. Top Part: Bigger Logo | ADMIN + Bottom Separator */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200/90">
                  <img
                    src="/Assets/ArenaTV Logo.png"
                    alt="ArenaTV"
                    className="h-9 w-auto object-contain"
                  />
                  <span className="h-5 w-px bg-slate-300" />
                  <span className="text-xs font-extrabold tracking-widest uppercase text-slate-900">
                    ADMIN
                  </span>
                </div>

                {/* 2. Middle Part: Two Groupings (General & Technical) */}
                <div className="flex flex-col gap-5 pt-4">
                  {navGroups.map((group) => (
                    <div key={group.label} className="flex flex-col gap-1">
                      <span className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {group.label}
                      </span>
                      <nav className="flex flex-col gap-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                  ? 'bg-red-50 text-red-600 border border-red-200/80 font-semibold shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                              }`}
                            >
                              <Icon
                                className={`w-4 h-4 ${
                                  isActive ? 'text-red-600' : 'text-slate-400'
                                }`}
                              />
                              {item.name}
                            </Link>
                          );
                        })}
                      </nav>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Bottom Part: Admin Account & Sign Out */}
              <div className="pt-4 border-t border-slate-200/90 shrink-0">
                <div className="flex items-center justify-between px-1.5">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="truncate text-xs">
                      <p className="font-semibold text-slate-900 truncate">{adminName}</p>
                      <p className="text-[10px] text-slate-500">Master Access</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </aside>

            {/* Mobile Topbar */}
            <div className="md:hidden flex flex-col border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/Assets/ArenaTV Logo.png"
                    alt="ArenaTV"
                    className="h-8 w-auto object-contain"
                  />
                  <span className="h-4 w-px bg-slate-300" />
                  <span className="text-xs font-extrabold tracking-widest uppercase text-slate-900">
                    ADMIN
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-slate-600 hover:text-slate-900"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>

              {/* Mobile Drawer Menu */}
              {mobileMenuOpen && (
                <div className="p-4 border-t border-slate-100 bg-white flex flex-col gap-4">
                  {navGroups.map((group) => (
                    <div key={group.label} className="flex flex-col gap-1">
                      <span className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {group.label}
                      </span>
                      <nav className="flex flex-col gap-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                  ? 'bg-red-50 text-red-600 font-semibold'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <Icon
                                className={`w-4 h-4 ${
                                  isActive ? 'text-red-600' : 'text-slate-400'
                                }`}
                              />
                              {item.name}
                            </Link>
                          );
                        })}
                      </nav>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{adminName}</span>
                    <button
                      onClick={handleSignOut}
                      className="text-xs text-red-600 font-semibold flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  );
}
