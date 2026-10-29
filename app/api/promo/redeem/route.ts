import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const userId = typeof body.userId === 'string' && body.userId ? body.userId : null;
    const userEmail = typeof body.userEmail === 'string' && body.userEmail ? body.userEmail : null;

    if (!rawCode) {
      return NextResponse.json(
        { success: false, message: 'Please enter a promo code.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Try calling the server-side Postgres RPC `redeem_promo_code`
    const { data: rpcData, error: rpcError } = await supabase.rpc('redeem_promo_code', {
      p_code: rawCode,
      p_user_id: userId,
      p_user_email: userEmail,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object' && 'success' in rpcData) {
      const result = rpcData as {
        success: boolean;
        code?: string;
        discount_percent?: number;
        duration_minutes?: number;
        activated_at?: string;
        expires_at?: string;
        message?: string;
      };

      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message || 'Invalid or expired promo code.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        code: result.code || rawCode,
        discount_percent: result.discount_percent ?? 100,
        duration_minutes: result.duration_minutes ?? 30,
        activated_at: result.activated_at || new Date().toISOString(),
        expires_at:
          result.expires_at ||
          new Date(Date.now() + (result.duration_minutes ?? 30) * 60 * 1000).toISOString(),
        message: result.message || 'Promo code applied! Free access activated.',
      });
    }

    // 2. Fallback: Direct table query on `public.promo_codes` if RPC function wasn't created yet
    const { data: promo, error: promoErr } = await supabase
      .from('promo_codes')
      .select('*')
      .ilike('code', rawCode)
      .maybeSingle();

    if (promoErr || !promo) {
      return NextResponse.json(
        {
          success: false,
          notFoundInDb: true,
          message: 'Invalid promo code. Please check the code and try again.',
        },
        { status: 404 }
      );
    }

    if (!promo.is_active) {
      return NextResponse.json(
        { success: false, message: 'This promo code is no longer active.' },
        { status: 400 }
      );
    }

    const nowMs = Date.now();
    const promoExpiresMs = new Date(promo.expires_at).getTime();

    if (promoExpiresMs <= nowMs) {
      return NextResponse.json(
        { success: false, message: 'This promo code has expired.' },
        { status: 400 }
      );
    }

    if (promo.used_count >= promo.max_uses) {
      return NextResponse.json(
        { success: false, message: 'This promo code has reached its usage limit.' },
        { status: 400 }
      );
    }

    // Determine duration in minutes (clamped to max 24 hours = 1440 mins)
    const rawDurationMinutes =
      (promo as any).duration_minutes ||
      Math.max(5, Math.min(1440, Math.round((promoExpiresMs - new Date(promo.created_at || nowMs).getTime()) / (60 * 1000))));
    const durationMinutes = Math.min(1440, Math.max(1, Number(rawDurationMinutes) || 30));

    const activatedAtIso = new Date(nowMs).toISOString();
    const subExpiresAtIso = new Date(nowMs + durationMinutes * 60 * 1000).toISOString();

    // Increment used_count
    await supabase
      .from('promo_codes')
      .update({ used_count: (promo.used_count || 0) + 1 })
      .eq('id', promo.id);

    // Record active subscription for the user
    if (userId) {
      await supabase.from('subscriptions').insert({
        user_id: userId,
        plan_name: `ArenaX Promo (${promo.code})`,
        provider: 'Promo Code',
        phone: 'Admin',
        amount: 0,
        status: 'active',
        activated_at: activatedAtIso,
        expires_at: subExpiresAtIso,
      });
    }

    return NextResponse.json({
      success: true,
      code: promo.code,
      discount_percent: promo.discount_percent,
      duration_minutes: durationMinutes,
      activated_at: activatedAtIso,
      expires_at: subExpiresAtIso,
      message: `Promo code ${promo.code} applied! Unlocked for ${formatDurationLabel(durationMinutes)}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Could not redeem promo code.' },
      { status: 500 }
    );
  }
}

function formatDurationLabel(minutes: number): string {
  if (minutes === 5) return '5 Minutes';
  if (minutes === 30) return '30 Minutes';
  if (minutes === 60) return '1 Hour';
  if (minutes === 360) return '6 Hours';
  if (minutes === 1440) return '24 Hours';
  if (minutes < 60) return `${minutes} Minutes`;
  return `${Math.round(minutes / 60)} Hours`;
}

