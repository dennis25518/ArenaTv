-- ====================================================================
-- ArenaX Admin Roles & Policies Migration
-- ====================================================================

-- 1. Add role column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' 
  CHECK (role IN ('user', 'admin'));

-- 2. Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update RLS policies for channels:
-- Admins can insert, update, and delete channels
CREATE POLICY "Admins can manage channels" 
  ON public.channels FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Update RLS policies for subscriptions:
-- Admins can view and manage all subscriptions
CREATE POLICY "Admins can view all subscriptions" 
  ON public.subscriptions FOR SELECT 
  USING (public.is_admin());

CREATE POLICY "Admins can manage all subscriptions" 
  ON public.subscriptions FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Update RLS policies for profiles:
-- Admins can view and manage all profiles
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" 
  ON public.profiles FOR UPDATE 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
