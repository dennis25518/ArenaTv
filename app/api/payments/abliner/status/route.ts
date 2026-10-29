import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ABLINER_API_KEY =
  process.env.ABLINER_API_KEY ||
  'tsl_live_89b99438c9fa3beb21c055d6907bc9e2a50369dd5025487cc58ccbcb00fda32e';
const ABLINER_BASE_URL = process.env.ABLINER_BASE_URL || 'https://abliner.net/api/v1';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('id');
    const reference = searchParams.get('reference');
    const userId = searchParams.get('userId');

    if (!transactionId && !reference) {
      return NextResponse.json({ success: false, message: 'Missing transaction id or reference' }, { status: 400 });
    }

    // 1. Check if Supabase already marked it active
    if (userId) {
      const supabase = await createClient();
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub && new Date(sub.expires_at).getTime() > Date.now()) {
        return NextResponse.json({
          success: true,
          status: 'completed',
          isPaid: true,
          subscription: sub,
        });
      }
    }

    // 2. Query Abliner for transaction status
    const queryParam = transactionId ? `id=${encodeURIComponent(transactionId)}` : `reference=${encodeURIComponent(reference || '')}`;
    const ablinerRes = await fetch(`${ABLINER_BASE_URL}/deposits?${queryParam}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ABLINER_API_KEY}`,
      },
    });

    if (ablinerRes.ok) {
      const ablinerData = await ablinerRes.json().catch(() => ({}));
      const tx = ablinerData?.data || ablinerData;
      const status = (tx?.status || '').toLowerCase();
      const isPaid = status === 'completed' || status === 'successful' || status === 'paid';

      if (isPaid && userId) {
        // Activate in Supabase
        const supabase = await createClient();
        const nowIso = new Date().toISOString();
        const expiresAtIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            activated_at: nowIso,
            expires_at: expiresAtIso,
          })
          .eq('user_id', userId);
      }

      return NextResponse.json({
        success: true,
        status: status || 'pending',
        isPaid: isPaid,
        data: tx,
      });
    }

    return NextResponse.json({ success: true, status: 'pending', isPaid: false });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Error checking status' }, { status: 500 });
  }
}

