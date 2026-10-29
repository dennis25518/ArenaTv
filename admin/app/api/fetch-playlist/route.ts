import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid URL' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url.trim(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote server returned HTTP ${response.status}` },
        { status: 400 }
      );
    }

    const text = await response.text();
    return NextResponse.json({ content: text, status: response.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.name === 'AbortError'
            ? 'Request timed out while fetching playlist URL'
            : err?.message || 'Failed to fetch URL',
      },
      { status: 500 }
    );
  }
}

