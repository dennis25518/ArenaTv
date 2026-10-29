-- =====================================================================
-- Migration: Create promo_codes table, promo_redemptions table & RPCs
-- Valid durations supported: 5m, 30m, 1h (60m), 6h (360m), 24h (1440m)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 100 CHECK (discount_percent >= 1 AND discount_percent <= 100),
  applicable_plan TEXT NOT NULL DEFAULT 'All Plans',
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes >= 1 AND duration_minutes <= 1440),
  max_uses INTEGER NOT NULL DEFAULT 100 CHECK (max_uses >= 1),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure duration_minutes exists if promo_codes was created previously
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30;

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promo_redemptions (promo_code_id, user_id);

-- Enable Row Level Security
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies for promo_codes
DROP POLICY IF EXISTS "Allow public read promo_codes" ON public.promo_codes;
CREATE POLICY "Allow public read promo_codes"
  ON public.promo_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert promo_codes" ON public.promo_codes;
CREATE POLICY "Allow insert promo_codes"
  ON public.promo_codes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update promo_codes" ON public.promo_codes;
CREATE POLICY "Allow update promo_codes"
  ON public.promo_codes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete promo_codes" ON public.promo_codes;
CREATE POLICY "Allow delete promo_codes"
  ON public.promo_codes
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Policies for promo_redemptions
DROP POLICY IF EXISTS "Allow read promo_redemptions" ON public.promo_redemptions;
CREATE POLICY "Allow read promo_redemptions"
  ON public.promo_redemptions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert promo_redemptions" ON public.promo_redemptions;
CREATE POLICY "Allow insert promo_redemptions"
  ON public.promo_redemptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =====================================================================
-- RPC 1: Server Function to Generate a Promo Code
-- =====================================================================
CREATE OR REPLACE FUNCTION public.generate_promo_code(
  p_code TEXT DEFAULT NULL,
  p_discount_percent INTEGER DEFAULT 100,
  p_applicable_plan TEXT DEFAULT 'All Plans',
  p_max_uses INTEGER DEFAULT 100,
  p_duration_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_suffix TEXT := '';
  v_prefix TEXT;
  v_duration INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_inserted public.promo_codes;
  i INTEGER;
BEGIN
  -- Clamp duration_minutes to max 24 hours (1440 minutes)
  v_duration := LEAST(1440, GREATEST(1, COALESCE(p_duration_minutes, 30)));

  IF p_code IS NULL OR LENGTH(TRIM(p_code)) = 0 THEN
    FOR i IN 1..4 LOOP
      v_suffix := v_suffix || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
    END LOOP;
    v_prefix := CASE WHEN COALESCE(p_discount_percent, 100) = 100 THEN 'VIPFREE' ELSE 'ARENA' || COALESCE(p_discount_percent, 100)::TEXT END;
    v_clean_code := v_prefix || '-' || v_suffix;
  ELSE
    v_clean_code := UPPER(TRIM(p_code));
  END IF;

  v_expires_at := NOW() + (v_duration || ' minutes')::INTERVAL;

  INSERT INTO public.promo_codes (
    code,
    discount_percent,
    applicable_plan,
    duration_minutes,
    max_uses,
    used_count,
    expires_at,
    is_active
  )
  VALUES (
    v_clean_code,
    COALESCE(p_discount_percent, 100),
    COALESCE(p_applicable_plan, 'All Plans'),
    v_duration,
    COALESCE(p_max_uses, 100),
    0,
    v_expires_at,
    true
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'promo', to_jsonb(v_inserted)
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Promo code already exists. Please try another code.'
  );
WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

-- =====================================================================
-- RPC 2: Server Function to Redeem a Promo Code
-- =====================================================================
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_code TEXT;
  v_promo public.promo_codes;
  v_already_redeemed BOOLEAN := false;
  v_duration INTEGER;
  v_activated_at TIMESTAMPTZ := NOW();
  v_sub_expires_at TIMESTAMPTZ;
BEGIN
  v_clean_code := UPPER(TRIM(COALESCE(p_code, '')));

  IF LENGTH(v_clean_code) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please enter a valid promo code.');
  END IF;

  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE UPPER(code) = v_clean_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid promo code. Please check and try again.');
  END IF;

  IF NOT v_promo.is_active THEN
    RETURN jsonb_build_object('success', false, 'message', 'This promo code is no longer active.');
  END IF;

  IF v_promo.expires_at <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', 'This promo code has expired.');
  END IF;

  IF v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'message', 'This promo code has reached its usage limit.');
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.promo_redemptions
      WHERE promo_code_id = v_promo.id AND user_id = p_user_id
    ) INTO v_already_redeemed;

    IF v_already_redeemed THEN
      RETURN jsonb_build_object('success', false, 'message', 'You have already redeemed this promo code.');
    END IF;
  END IF;

  v_duration := LEAST(1440, GREATEST(1, COALESCE(v_promo.duration_minutes, 30)));
  v_sub_expires_at := v_activated_at + (v_duration || ' minutes')::INTERVAL;

  -- Increment used_count
  UPDATE public.promo_codes
  SET used_count = used_count + 1
  WHERE id = v_promo.id;

  -- Record redemption
  INSERT INTO public.promo_redemptions (promo_code_id, code, user_id, user_email)
  VALUES (v_promo.id, v_promo.code, p_user_id, p_user_email);

  -- Create active subscription record if user_id is present
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      user_id,
      plan_name,
      provider,
      phone,
      amount,
      status,
      activated_at,
      expires_at
    ) VALUES (
      p_user_id,
      'ArenaX Promo (' || v_promo.code || ')',
      'Promo Code',
      'Admin',
      0,
      'active',
      v_activated_at,
      v_sub_expires_at
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'code', v_promo.code,
    'discount_percent', v_promo.discount_percent,
    'duration_minutes', v_duration,
    'activated_at', v_activated_at,
    'expires_at', v_sub_expires_at,
    'message', 'Promo code applied! Free access activated.'
  );
END;
$$;

