import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ABLINER_API_KEY =
  process.env.ABLINER_API_KEY ||
  'tsl_live_89b99438c9fa3beb21c055d6907bc9e2a50369dd5025487cc58ccbcb00fda32e';
const ABLINER_BASE_URL = process.env.ABLINER_BASE_URL || 'https://abliner.net/api/v1';

/**
 * Normalizes Tanzanian phone numbers to standard format (255XXXXXXXXX)
 */
function normalizeTzPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('255') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return '255' + digits.substring(1);
  }
  if (digits.length === 9) {
    return '255' + digits;
  }
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, amount = 2000, provider = 'M-Pesa', userId, userEmail } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid phone number.' },
        { status: 400 }
      );
    }

    const cleanPhone = normalizeTzPhone(phone);
    if (!cleanPhone.startsWith('255') || cleanPhone.length !== 12) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid Tanzanian phone number. Please enter in 07XX or 06XX format.',
        },
        { status: 400 }
      );
    }

    const planAmount = Number(amount) || 2000;
    const orderReference = `ARENAX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Trigger Mobile Money STK Push on Abliner
    const ablinerRes = await fetch(`${ABLINER_BASE_URL}/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ABLINER_API_KEY}`,
      },
      body: JSON.stringify({
        amount: planAmount,
        currency: 'TZS',
        method: 'mobile',
        phone: cleanPhone,
        reference: orderReference,
        metadata: {
          user_id: userId || null,
          user_email: userEmail || null,
          plan: 'ArenaX Pro 30 Days',
          provider: provider,
        },
      }),
    });

    const ablinerData = await ablinerRes.json().catch(() => ({}));

    if (!ablinerRes.ok) {
      console.error('Abliner deposit error:', ablinerRes.status, ablinerData);
      return NextResponse.json(
        {
          success: false,
          message:
            ablinerData?.message ||
            ablinerData?.error ||
            'Failed to initiate USSD prompt with your mobile network. Please verify your number.',
        },
        { status: ablinerRes.status || 400 }
      );
    }

    const transactionId = ablinerData?.id || ablinerData?.data?.id || orderReference;

    // Save pending subscription in Supabase
    if (userId) {
      try {
        const supabase = await createClient();
        await supabase.from('subscriptions').insert({
          user_id: userId,
          plan_name: 'ArenaX Pro (30 Days)',
          provider: provider,
          phone: cleanPhone,
          amount: planAmount,
          status: 'pending',
          activated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch (dbErr) {
        console.warn('Subscription DB insert note:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      transactionId: transactionId,
      reference: orderReference,
      phone: cleanPhone,
      message: 'USSD prompt dispatched! Please enter your PIN on your phone to complete payment.',
      data: ablinerData,
    });
  } catch (err: any) {
    console.error('Abliner push server error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error initiating payment.' },
      { status: 500 }
    );
  }
}

