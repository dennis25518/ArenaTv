'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useStream } from '@/context/StreamContext';

interface TopChannelCard {
  rank: number;
  name: string;
  category: string;
  logo: string;
  accent: string;
  logoBg?: string;
}

const TOP_10_CHANNELS: TopChannelCard[] = [
  {
    rank: 1,
    name: 'BBC News HD',
    category: 'News',
    logo: '/channel-logos/News/bbc.jpg',
    accent: 'from-red-900/80 via-[#14141c] to-[#0d0d12]',
  },
  {
    rank: 2,
    name: 'Cartoon Network',
    category: 'Cartoons',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Cartoon_Network_2010_logo.svg/960px-Cartoon_Network_2010_logo.svg.png',
    accent: 'from-sky-900/75 via-[#14141c] to-[#0d0d12]',
    logoBg: 'bg-white p-2.5 rounded-xl',
  },
  {
    rank: 3,
    name: 'Sky Sports',
    category: 'Sports',
    logo: '/channel-logos/Sports/Sky_Sports_Premier_League.png',
    accent: 'from-blue-900/80 via-[#14141c] to-[#0d0d12]',
    logoBg: 'bg-white p-2.5 rounded-xl',
  },
  {
    rank: 4,
    name: 'TBC 1',
    category: 'Local',
    logo: 'https://i.imgur.com/OmiVZ1u.png',
    accent: 'from-emerald-900/75 via-[#14141c] to-[#0d0d12]',
    logoBg: 'bg-white p-2.5 rounded-xl',
  },
  {
    rank: 5,
    name: 'National Geographic',
    category: 'Nature',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Natgeologo.svg/960px-Natgeologo.svg.png',
    accent: 'from-amber-900/75 via-[#14141c] to-[#0d0d12]',
    logoBg: 'bg-white p-2.5 rounded-xl',
  },
  {
    rank: 6,
    name: 'AMC Cinema HD',
    category: 'Movies',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/AMC_logo_2019.svg/960px-AMC_logo_2019.svg.png',
    accent: 'from-rose-900/75 via-[#14141c] to-[#0d0d12]',
    logoBg: 'bg-white p-2.5 rounded-xl',
  },
  {
    rank: 7,
    name: 'Trace Urban',
    category: 'Music',
    logo: '/channel-logos/Music/Trace%20Urban.png',
    accent: 'from-purple-900/75 via-[#14141c] to-[#0d0d12]',
    logoBg: 'bg-white p-2 rounded-xl',
  },
  {
    rank: 8,
    name: 'beIN Sports',
    category: 'Football',
    logo: '/channel-logos/Sports/beIN_Sports_1.png',
    accent: 'from-indigo-900/80 via-[#14141c] to-[#0d0d12]',
    logoBg: 'bg-white p-2 rounded-xl',
  },
  {
    rank: 9,
    name: 'CNN International',
    category: 'World News',
    logo: '/channel-logos/News/cnn.png',
    accent: 'from-red-950/85 via-[#14141c] to-[#0d0d12]',
    logoBg: 'bg-white p-2.5 rounded-xl',
  },
  {
    rank: 10,
    name: 'Animal Planet HD',
    category: 'Animals',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/2018_Animal_Planet_logo.svg/960px-2018_Animal_Planet_logo.svg.png',
    accent: 'from-teal-900/75 via-[#14141c] to-[#0d0d12]',
    logoBg: 'bg-white p-2.5 rounded-xl',
  },
];

export const LandingPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { subscription } = useStream();

  // Hero inline email state (Netflix-style "Enter your email -> Get Started")
  const [heroEmail, setHeroEmail] = useState('');

  const openAuth = (mode: 'login' | 'register', prefillEmail?: string) => {
    if (user) {
      router.push(subscription.isActive ? '/channels' : '/profile');
      return;
    }

    if (mode === 'login') {
      router.push('/signin');
    } else if (prefillEmail) {
      router.push(`/signup?email=${encodeURIComponent(prefillEmail)}`);
    } else {
      router.push('/signup');
    }
  };

  const handleHeroGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    openAuth('register', heroEmail.trim());
  };

  const mobileNetworks = [
    { name: 'M-Pesa', logo: '/Mobile Networks/Vodacom.png' },
    { name: 'Tigo Pesa / Yas', logo: '/Mobile Networks/YAS.jpg' },
    { name: 'Airtel Money', logo: '/Mobile Networks/Airtel.jpg' },
    { name: 'HaloPesa', logo: '/Mobile Networks/Halotel.jpg' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* =================================================================== */}
      {/* 1. UNIFIED NAVBAR + HERO SECTION (Single Element like Netflix)      */}
      {/* =================================================================== */}
      <section
        className="relative w-full min-h-[560px] sm:min-h-[650px] lg:min-h-[720px] flex flex-col justify-between bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{
          backgroundImage: "url('/Assets/hero-bg.jpg')",
        }}
      >
        {/* Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/95" />

        {/* Top Navbar (Inside the Hero Element — No separate bar or border) */}
        <header className="relative z-10 w-full max-w-7xl mx-auto pl-7 pr-4 sm:pl-14 sm:pr-8 lg:pl-24 lg:pr-12 pt-5 sm:pt-7 flex items-center justify-between">
          {/* Left: Official Transparent ArenaTV Logo */}
          <div className="flex items-center select-none">
            <img
              src="/Assets/ArenaTV Logo.png"
              alt="ArenaTV"
              className="h-14 sm:h-16 lg:h-20 w-auto object-contain drop-shadow-md"
            />
          </div>

          {/* Right: Sign In Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="px-4 sm:px-5 py-2 rounded-lg bg-[#e50914] hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95"
            >
              Sign In
            </button>
          </div>
        </header>

        {/* Center Hero Content (Netflix Layout) */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-8 max-w-3xl mx-auto py-12 sm:py-16">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] drop-shadow-sm">
            Unlimited Live TV, Sports, Movies, and more
          </h1>

          <p className="text-base sm:text-xl font-bold text-white/95 mt-4 sm:mt-5">
            Starts at 2,000 TZS. Cancel anytime.
          </p>

          <p className="text-xs sm:text-base text-white/85 font-medium mt-5 sm:mt-6 max-w-xl">
            Ready to watch? Enter your email to create your account or redeem a free promo code.
          </p>

          {/* Netflix-style Email + Get Started Bar */}
          <form
            onSubmit={handleHeroGetStarted}
            className="mt-4 sm:mt-5 w-full max-w-xl flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-2 px-2 sm:px-0"
          >
            <input
              type="email"
              required
              placeholder="Email address"
              value={heroEmail}
              onChange={(e) => setHeroEmail(e.target.value)}
              className="w-full sm:flex-1 h-12 sm:h-14 py-3 px-4 rounded-md bg-black/65 backdrop-blur-xs text-white placeholder-neutral-300 text-base font-normal border border-white/40 focus:outline-none focus:border-white focus:ring-1 focus:ring-white shadow-lg"
            />
            <button
              type="submit"
              className="w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-md bg-[#e50914] hover:bg-red-700 text-white font-bold text-lg sm:text-xl flex items-center justify-center gap-1.5 shrink-0 shadow-lg transition-all cursor-pointer active:scale-98"
            >
              <span>Get Started</span>
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Bottom Spacer for Curved Arch Overlap */}
        <div className="h-10 sm:h-14" />
      </section>

      {/* NETFLIX CURVED ARCH SEPARATOR */}
      <div className="relative w-full h-16 sm:h-24 -mt-10 sm:-mt-14 z-20 overflow-hidden pointer-events-none">
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-[180%] sm:w-[140%] lg:w-[125%] h-[180px] sm:h-[220px] rounded-t-[100%]"
          style={{
            background:
              'linear-gradient(to right, rgba(33, 13, 22, 1) 16%, rgba(184, 40, 105, 1), rgba(229, 9, 20, 1), rgba(184, 40, 105, 1), rgba(33, 13, 22, 1) 84%)',
          }}
        >
          <div className="absolute inset-x-0 top-[4px] bottom-0 rounded-t-[100%] bg-black" />
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. NETFLIX-STYLE TOP 10 CHANNELS SECTION (Dark Background)          */}
      {/* =================================================================== */}
      <main className="flex-1 flex flex-col bg-black relative z-20 -mt-2 sm:-mt-4">
        <section className="pt-4 pb-10 sm:pb-14 px-4 sm:px-8 lg:px-14 max-w-5xl mx-auto w-full flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-white">
              What You Get Inside ArenaTV
            </h2>
          </div>

          {/* Two Rows of 5 Cards (Scrollable Left-to-Right on Mobile, Compact 5-Col Grid on Desktop) */}
          <div className="flex flex-col gap-5 sm:gap-7">
            {[TOP_10_CHANNELS.slice(0, 5), TOP_10_CHANNELS.slice(5, 10)].map((rowItems, rowIndex) => (
              <div
                key={rowIndex}
                className="flex md:grid md:grid-cols-5 overflow-x-auto md:overflow-visible no-scrollbar gap-4 sm:gap-5 md:gap-6 pl-3 pr-2 py-1 snap-x snap-mandatory"
              >
                {rowItems.map((item) => (
                  <div
                    key={item.rank}
                    onClick={() => openAuth('register')}
                    className="group relative shrink-0 w-[124px] sm:w-[142px] md:w-full snap-start cursor-pointer select-none transition-transform duration-300 hover:scale-105"
                  >
                    {/* Compact Card Poster Container */}
                    <div
                      className={`relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-gradient-to-b ${item.accent} border border-white/15 group-hover:border-red-500/60 shadow-xl flex flex-col items-center justify-between p-2.5 sm:p-3`}
                    >
                      {/* Top Row: Category Pill */}
                      <div className="w-full flex items-center justify-between z-10">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/55 text-white/90 border border-white/10 backdrop-blur-xs">
                          {item.category}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e50914] shadow-[0_0_6px_#e50914]" />
                      </div>

                      {/* Center: Channel Icon / Logo */}
                      <div className="my-auto flex items-center justify-center w-full px-1 z-10">
                        <div
                          className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl overflow-hidden shadow-md transition-transform duration-300 group-hover:scale-105 ${
                            item.logoBg || 'bg-black/30'
                          }`}
                        >
                          <img
                            src={item.logo}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>

                      {/* Bottom: Channel Title */}
                      <div className="w-full text-right z-10 pt-1">
                        <p className="text-[10px] sm:text-xs font-extrabold text-white truncate drop-shadow-md">
                          {item.name}
                        </p>
                      </div>

                      {/* Subtle Bottom Vignette */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent" />
                    </div>

                    {/* Iconic Netflix Outlined Rank Number (1 - 10) at Bottom-Left */}
                    <span
                      className="pointer-events-none absolute -left-2.5 sm:-left-3 bottom-1 z-20 font-black leading-none select-none text-[46px] sm:text-[54px] lg:text-[62px] tracking-tighter"
                      style={{
                        color: '#000000',
                        WebkitTextStroke: '2px #ffffff',
                        textShadow: '0 4px 14px rgba(0,0,0,0.85)',
                      }}
                    >
                      {item.rank}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* 3. PRICING & MOBILE MONEY SECTION (Dark Theme) */}
        <section className="pb-14 sm:pb-20 px-4 sm:px-8 lg:px-14 max-w-5xl mx-auto w-full">
          <div className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-[#111217] border border-white/10 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex flex-col gap-3 max-w-xl text-center lg:text-left">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                One Affordable Pass.
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Create your free account in seconds, then activate with any mobile network
              </p>

              {/* Supported Mobile Networks (No white background box) */}
              <div className="flex items-center justify-center lg:justify-start gap-3 pt-2 flex-wrap">
                {mobileNetworks.map((net) => (
                  <img
                    key={net.name}
                    src={net.logo}
                    alt={net.name}
                    title={net.name}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover shadow-md"
                  />
                ))}
              </div>
            </div>

            <div className="w-full lg:w-72 p-6 rounded-2xl bg-[#181920] border border-white/10 flex flex-col items-center text-center gap-4 shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  ArenaX Pro
                </span>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-[#e50914]">2,000</span>
                  <span className="text-xs font-bold text-neutral-400">TZS / MONTH</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openAuth('register')}
                className="w-full py-3 rounded-xl bg-[#e50914] hover:bg-red-700 text-white font-black text-sm shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 4. FOOTER */}
      <footer className="py-6 px-4 sm:px-8 bg-black border-t border-white/10 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} ArenaTV Live Streaming. All rights reserved.
      </footer>
    </div>
  );
};
