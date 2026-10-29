import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ alive: false, reason: 'Invalid URL' });
    }

    if (url.startsWith('/api/embed/')) {
      return NextResponse.json({ alive: true });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        try {
          await response.body?.cancel();
        } catch {}
        return NextResponse.json({ alive: false, status: response.status });
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const isM3u8 =
        url.toLowerCase().includes('.m3u8') ||
        contentType.includes('mpegurl') ||
        contentType.includes('apple.mpegurl');

      if (isM3u8) {
        const text = await response.text();
        const hasExtM3u = text.includes('#EXTM3U');
        const hasSegmentsOrVariants =
          text.includes('#EXTINF') || text.includes('#EXT-X-STREAM-INF');

        const alive = hasExtM3u && hasSegmentsOrVariants;
        return NextResponse.json({ alive, status: response.status });
      }

      try {
        await response.body?.cancel();
      } catch {}

      return NextResponse.json({ alive: true, status: response.status });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      return NextResponse.json({
        alive: false,
        reason: fetchErr?.name === 'AbortError' ? 'Timeout' : 'Unreachable',
      });
    }
  } catch (err: any) {
    return NextResponse.json({ alive: false, reason: err?.message || 'Error' });
  }
}
