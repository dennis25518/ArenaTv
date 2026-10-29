import { NextRequest, NextResponse } from 'next/server';

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const upstreamUrl = decodeURIComponent(targetUrl);

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: '*/*',
    };

    const customReferer = searchParams.get('referer');
    if (customReferer) {
      headers['Referer'] = customReferer;
      headers['Origin'] = new URL(customReferer).origin;
    }

    const response = await fetch(upstreamUrl, {
      headers,
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok) {
      return new NextResponse(`Upstream error: ${response.status} ${response.statusText}`, {
        status: response.status,
      });
    }

    const finalUpstreamUrl = response.url || upstreamUrl;
    const contentType = response.headers.get('content-type') || '';
    const isM3U8 =
      finalUpstreamUrl.includes('.m3u8') ||
      upstreamUrl.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL') ||
      contentType.includes('application/vnd.apple.mpegurl');

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    };

    if (isM3U8) {
      const text = await response.text();
      const currentOrigin = new URL(req.url).origin;
      const proxyBase = `${currentOrigin}/api/stream-proxy?url=`;
      const refererParam = customReferer ? `&referer=${encodeURIComponent(customReferer)}` : '';

      const rewrittenLines = text.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        if (trimmed.startsWith('#')) {
          return line.replace(/URI="([^"]+)"/g, (_, uri) => {
            const absolute = resolveUrl(uri, finalUpstreamUrl);
            return `URI="${proxyBase}${encodeURIComponent(absolute)}${refererParam}"`;
          });
        }

        const absoluteUrl = resolveUrl(trimmed, finalUpstreamUrl);
        return `${proxyBase}${encodeURIComponent(absoluteUrl)}${refererParam}`;
      });

      return new NextResponse(rewrittenLines.join('\n'), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
        },
      });
    }

    // Binary segment (.ts / .m4s / etc.)
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType || 'video/mp2t',
      },
    });
  } catch (error: any) {
    console.error('Admin stream proxy error:', error);
    return new NextResponse(`Proxy error: ${error?.message || 'Unknown error'}`, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

