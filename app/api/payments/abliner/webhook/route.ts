import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

const ABLINER_WEBHOOK_SECRET =
  process.env.ABLINER_WEBHOOK_SECRET ||
  'whsec_9866e0b1c6531b41a74dd4fa7b206f6d4cabe49e0e0058f667ea0e9d4b48cc24';

/**
 * Validates HMAC SHA-256 signature from Abliner
 */
function verifySignature(payload: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !ABLINER_WEBHOOK_SECRET) return true; // allow if secret not configured

  try {
    const computed = crypto
      .createHmac('sha256', ABLINER_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch (err) {
    console.warn('Signature verification check error:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-webhook-signature') ||
      req.headers.get('x-signature') ||
      req.headers.get('signature');

    const isValid = verifySignature(rawBody, signature);
    if (!isValid) {
      console.warn('Invalid Abliner webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    console.log('Received Abliner Webhook event:', event?.event || event?.type || event);

    const eventType = (event?.event || event?.type || '').toLowerCase();
    const data = event?.data || event;

    // Check if deposit or payment succeeded
    const isSuccess =
      eventType.includes('completed') ||
      eventType.includes('success') ||
      eventType.includes('paid') ||
      data?.status === 'completed' ||
      data?.status === 'successful';

    if (isSuccess) {
      const metadata = data?.metadata || {};
      const userId = metadata?.user_id;
      const phone = data?.phone || metadata?.phone;
      const provider = metadata?.provider || 'Mobile Money';
      const amount = data?.amount || 2000;

      if (userId) {
        const supabase = await createClient();
        const nowIso = new Date().toISOString();
        const expiresAtIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Update any pending subscription or insert active one
        const { error: updateErr } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            activated_at: nowIso,
            expires_at: expiresAtIso,
            phone: phone || 'Mobile Wallet',
            provider: provider,
            amount: Number(amount) || 2000,
          })
          .eq('user_id', userId)
          .eq('status', 'pending');

        if (updateErr) {
          await supabase.from('subscriptions').insert({
            user_id: userId,
            plan_name: 'ArenaX Pro (30 Days)',
            provider: provider,
            phone: phone || 'Mobile Wallet',
            amount: Number(amount) || 2000,
            status: 'active',
            activated_at: nowIso,
            expires_at: expiresAtIso,
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: err.message || 'Webhook failed' }, { status: 500 });
  }
}

