-- ====================================================================
-- Fix Profiles Policies and Sync all Users to public.profiles
-- ====================================================================

-- 1. Ensure RLS policies allow INSERT, UPDATE, and SELECT
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

-- 2. Update trigger function with SECURITY DEFINER and search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  assigned_role TEXT := 'user';
  user_name TEXT;
BEGIN
  IF (NEW.raw_user_meta_data->>'role') = 'admin' THEN
    assigned_role := 'admin';
  END IF;

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name', 
    NEW.raw_user_meta_data->>'full_name', 
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    user_name,
    NEW.email,
    assigned_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = CASE WHEN EXCLUDED.role = 'admin' THEN 'admin' ELSE profiles.role END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Synchronize all existing users from auth.users into public.profiles
INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'User') AS name,
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', 'user') AS role,
  COALESCE(u.created_at, NOW()) AS created_at,
  NOW() AS updated_at
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  name = COALESCE(profiles.name, EXCLUDED.name),
  email = COALESCE(profiles.email, EXCLUDED.email),
  role = COALESCE(profiles.role, EXCLUDED.role);
