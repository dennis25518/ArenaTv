import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const upstreamUrl = `https://cinevid.st/embed/channel/${encodeURIComponent(id)}`;
    const res = await fetch(upstreamUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return new NextResponse(`Upstream Cinevid error: ${res.status}`, {
        status: res.status,
      });
    }

    let html = await res.text();

    // 1. Remove the embed-guard.js script entirely (this is the script that injects "Apache Server at cinevid.st Port 443" when in an iframe)
    html = html.replace(
      /<script\s+src="\/embed-guard\.js[^"]*"[^>]*><\/script>/gi,
      '<!-- embed guard neutralized -->'
    );

    // 2. Re-point relative stylesheet and player scripts to absolute cinevid.st URLs
    html = html.replace(
      /href="\/(cv-player\.css[^"]*)"/gi,
      'href="https://cinevid.st/$1"'
    );
    html = html.replace(
      /src="\/(cv-unwrap\.js[^"]*)"/gi,
      'src="https://cinevid.st/$1"'
    );
    html = html.replace(
      /src="\/(cv-player\.js[^"]*)"/gi,
      'src="https://cinevid.st/$1"'
    );

    // 3. Inject CSS to ensure player fills the container cleanly
    const styleFix = `
      <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
        .cv-player-wrap, video { width: 100% !important; height: 100% !important; }
      </style>
    `;
    html = html.replace('</head>', `${styleFix}</head>`);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Embed proxy error: ${err?.message}`, {
      status: 500,
    });
  }
}
