-- Migration: Support Forever / Flexible Campaign Expiry on Promo Codes
-- Date: 2026-10-29

-- 1. Ensure expires_at can be checked for NULL (meaning never expires)
ALTER TABLE public.promo_codes ALTER COLUMN expires_at DROP NOT NULL;

-- 2. Update RPC generate_promo_code to support NULL or specific campaign expiry
CREATE OR REPLACE FUNCTION public.generate_promo_code(
  p_code TEXT DEFAULT NULL,
  p_discount_percent INTEGER DEFAULT 100,
  p_applicable_plan TEXT DEFAULT 'All Plans',
  p_max_uses INTEGER DEFAULT 100,
  p_duration_minutes INTEGER DEFAULT 1440, -- Default user access: 24 hours (1440 mins)
  p_campaign_expires_at TIMESTAMPTZ DEFAULT NULL -- NULL means live forever
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
  v_inserted public.promo_codes;
  i INTEGER;
BEGIN
  -- User access duration in minutes (default 24h = 1440 mins)
  v_duration := LEAST(1440, GREATEST(1, COALESCE(p_duration_minutes, 1440)));

  IF p_code IS NULL OR LENGTH(TRIM(p_code)) = 0 THEN
    FOR i IN 1..4 LOOP
      v_suffix := v_suffix || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
    END LOOP;
    v_prefix := CASE WHEN COALESCE(p_discount_percent, 100) = 100 THEN 'VIPFREE' ELSE 'ARENA' || COALESCE(p_discount_percent, 100)::TEXT END;
    v_clean_code := v_prefix || '-' || v_suffix;
  ELSE
    v_clean_code := UPPER(TRIM(p_code));
  END IF;

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
    COALESCE(p_max_uses, 999999),
    0,
    p_campaign_expires_at, -- NULL means Never Expires
    true
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'promo', row_to_json(v_inserted)
  );
END;
$$;

-- 3. Update RPC redeem_promo_code to allow codes with NULL expires_at (Never Expire)
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

  -- Only expire if an explicit campaign expiry is set and has passed
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', 'This promo code campaign has expired.');
  END IF;

  IF v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'message', 'This promo code has reached its usage limit.');
  END IF;

  -- STRICT ENFORCEMENT: A user can only redeem this promo code ONCE
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.promo_redemptions
      WHERE promo_code_id = v_promo.id AND user_id = p_user_id
    ) INTO v_already_redeemed;

    IF v_already_redeemed THEN
      RETURN jsonb_build_object('success', false, 'message', 'You have already redeemed this promo code on your account.');
    END IF;
  END IF;

  -- User access duration (default 24h / 1440 mins)
  v_duration := LEAST(1440, GREATEST(1, COALESCE(v_promo.duration_minutes, 1440)));
  v_sub_expires_at := v_activated_at + (v_duration || ' minutes')::INTERVAL;

  -- Increment total usage
  UPDATE public.promo_codes
  SET used_count = used_count + 1
  WHERE id = v_promo.id;

  -- Record redemption for this user
  INSERT INTO public.promo_redemptions (promo_code_id, code, user_id, user_email)
  VALUES (v_promo.id, v_promo.code, p_user_id, p_user_email);

  -- Create active subscription for the user with their individual pass duration
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
    'message', 'Promo code applied! 24-hour pass activated.'
  );
END;
$$;

