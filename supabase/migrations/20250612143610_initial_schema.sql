-- Fix RLS policy to allow trigger to insert profiles
-- The trigger runs with SECURITY DEFINER but auth.uid() might be NULL during signup

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Updated policy that allows both user inserts AND trigger inserts
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id OR  -- Normal user insert
    auth.uid() IS NULL       -- Allow trigger insert (auth.uid() is NULL in trigger context)
  );
