import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArenaTV - Live Video Streaming',
  description: 'Premium sports and live TV streaming experience',
  icons: {
    icon: '/Assets/Red TV Favicon.png',
    shortcut: '/Assets/Red TV Favicon.png',
    apple: '/Assets/Red TV Favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('arenax_theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/Assets/Red TV Favicon.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
