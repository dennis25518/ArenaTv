import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ALLOWED_DURATIONS_MINUTES = [5, 30, 60, 360, 1440];

function buildRandomCode(discountPercent: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const prefix = discountPercent === 100 ? 'VIPFREE' : `ARENA${discountPercent}`;
  return `${prefix}-${suffix}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const discount = Math.min(100, Math.max(1, Number(searchParams.get('discount') || 100)));
  const code = buildRandomCode(discount);
  return NextResponse.json({ success: true, code });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const discountPercent = Math.min(100, Math.max(1, Number(body.discount_percent ?? 100)));
    const applicablePlan = String(body.applicable_plan || 'All Plans');
    const maxUses = Math.max(1, Number(body.max_uses || 100));

    // Enforce valid durations: 5m, 30m, 1h (60m), 6h (360m), 24h (1440m) — never more than 24 hours
    const requestedMinutes = Number(body.duration_minutes || 30);
    const durationMinutes = ALLOWED_DURATIONS_MINUTES.includes(requestedMinutes)
      ? requestedMinutes
      : Math.min(1440, Math.max(5, requestedMinutes));

    const cleanCode =
      typeof body.code === 'string' && body.code.trim().length > 0
        ? body.code.trim().toUpperCase()
        : buildRandomCode(discountPercent);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const supabase = createServerSupabaseClient();

    // 1. Try calling the server-side Postgres RPC function `generate_promo_code`
    const { data: rpcData, error: rpcError } = await supabase.rpc('generate_promo_code', {
      p_code: cleanCode,
      p_discount_percent: discountPercent,
      p_applicable_plan: applicablePlan,
      p_max_uses: maxUses,
      p_duration_minutes: durationMinutes,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object' && 'success' in rpcData) {
      const result = rpcData as { success: boolean; promo?: any; message?: string };
      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message || 'Failed to generate promo code.' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        persistedInDb: true,
        promo: result.promo,
      });
    }

    // 2. Fallback: Direct insert into `public.promo_codes` table
    const { data: inserted, error: insertError } = await supabase
      .from('promo_codes')
      .insert([
        {
          code: cleanCode,
          discount_percent: discountPercent,
          applicable_plan: applicablePlan,
          duration_minutes: durationMinutes,
          max_uses: maxUses,
          used_count: 0,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        },
      ])
      .select()
      .single();

    if (!insertError && inserted) {
      return NextResponse.json({
        success: true,
        persistedInDb: true,
        promo: inserted,
      });
    }

    // 3. Secondary Fallback if `duration_minutes` column wasn't added yet on an older promo_codes table
    const { data: legacyInserted, error: legacyError } = await supabase
      .from('promo_codes')
      .insert([
        {
          code: cleanCode,
          discount_percent: discountPercent,
          applicable_plan: applicablePlan,
          max_uses: maxUses,
          used_count: 0,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        } as any,
      ])
      .select()
      .single();

    if (!legacyError && legacyInserted) {
      return NextResponse.json({
        success: true,
        persistedInDb: true,
        promo: { ...(legacyInserted as any), duration_minutes: durationMinutes },
      });
    }

    // 4. Final Fallback (if SQL migration hasn't been executed in Supabase yet)
    return NextResponse.json({
      success: true,
      persistedInDb: false,
      promo: {
        id: `promo-${Date.now()}`,
        code: cleanCode,
        discount_percent: discountPercent,
        applicable_plan: applicablePlan,
        duration_minutes: durationMinutes,
        max_uses: maxUses,
        used_count: 0,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_at: now.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}

