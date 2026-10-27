
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

export const runtime = 'nodejs';

// Direct mapping of channel slug to Cinevid/vidcdn internal ID
const SPORTS_CHANNEL_MAP: Record<string, { id: string; name: string }> = {
  'sky-sports-main-event': { id: '1981547', name: 'Sky Sports Main Event' },
  'sky-sports-premier-league': { id: '6265439', name: 'Sky Sports Premier League' },
  'sky-sports-football': { id: '9524014', name: 'Sky Sports Football' },
  'sky-sports-f1': { id: '4309056', name: 'Sky Sports F1' },
  'tnt-sports-1': { id: '1515990', name: 'TNT Sports 1' },
  'tnt-sports-2': { id: '6943897', name: 'TNT Sports 2' },
  'supersport-premier-league': { id: '2301676', name: 'SuperSport Premier League' },
  'dazn-laliga': { id: '8485565', name: 'DAZN LaLiga' },
  'dazn-1': { id: '6317633', name: 'DAZN 1' },
  'espn-usa': { id: '7111600', name: 'ESPN USA' },
  'fox-sports-1': { id: '2758460', name: 'Fox Sports 1' },
  'bein-sports-1': { id: '6432495', name: 'beIN Sports 1' },
};

const ORIGIN_IP = '5.178.101.135';

// In-memory token cache: { [channelId]: { streamUrl: string, expiresAt: number } }
const tokenCache = new Map<string, { streamUrl: string; expiresAt: number }>();

function httpsGet(path: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'GET',
        hostname: ORIGIN_IP,
        servername: 'vidcdn.vip',
        path,
        headers: {
          Host: 'vidcdn.vip',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Referer: 'https://cinevid.st/',
          Origin: 'https://cinevid.st',
        },
        timeout: 12000,
        rejectUnauthorized: false,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode || 500, data }));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    });
    req.end();
  });
}

async function getStreamToken(channelId: string): Promise<string | null> {
  const cached = tokenCache.get(channelId);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60000) {
    return cached.streamUrl;
  }

  try {
    const res = await httpsGet(`/api/stream/${channelId}`);
    if (res.status === 200) {
      const parsed = JSON.parse(res.data);
      if (parsed?.streamUrl) {
        // Tokens last 4 hours; cache for 3.5 hours
        tokenCache.set(channelId, {
          streamUrl: parsed.streamUrl,
          expiresAt: now + 3.5 * 60 * 60 * 1000,
        });
        return parsed.streamUrl;
      }
    }
  } catch (err: any) {
    console.error(`[sports-proxy] Error getting stream token for ${channelId}:`, err?.message);
  }

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channelInfo = SPORTS_CHANNEL_MAP[id] || { id, name: id };
  const channelId = channelInfo.id;

  const streamPath = await getStreamToken(channelId);
  if (!streamPath) {
    return new NextResponse(
      JSON.stringify({ error: `Unable to initialize stream for ${id}` }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    const manifestRes = await httpsGet(streamPath);
    if (manifestRes.status !== 200) {
      // Invalidate cache if upstream token was invalid
      tokenCache.delete(channelId);
      return new NextResponse(`Upstream stream error: ${manifestRes.status}`, {
        status: manifestRes.status,
      });
    }

    return new NextResponse(manifestRes.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error proxying manifest: ${err?.message}`, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
