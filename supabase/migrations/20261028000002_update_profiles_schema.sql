-- ====================================================================
-- Update Profiles Schema: (name, email, role)
-- Remove phone & avatar_url, support user vs admin registration
-- ====================================================================

-- 1. Add name and email columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill name and email from existing data
UPDATE public.profiles 
SET name = COALESCE(name, full_name, '')
WHERE name IS NULL;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Drop phone, avatar_url, and full_name
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS full_name;

-- 4. Update the trigger function to automatically set name, email, and role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT := 'user';
  user_name TEXT;
BEGIN
  -- If metadata specifies 'admin', assign admin role
  IF (NEW.raw_user_meta_data->>'role') = 'admin' THEN
    assigned_role := 'admin';
  END IF;

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name', 
    NEW.raw_user_meta_data->>'full_name', 
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    user_name,
    NEW.email,
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = CASE WHEN EXCLUDED.role = 'admin' THEN 'admin' ELSE profiles.role END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. If the admin user just registered, ensure their profile role is set to 'admin'
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE raw_user_meta_data->>'role' = 'admin' 
     OR email LIKE '%admin%'
);
