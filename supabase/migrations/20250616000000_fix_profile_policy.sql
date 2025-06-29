-- Fix RLS policy to ensure trigger can insert profiles
-- This migration ensures the correct policy is in place even if it was overwritten

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Updated policy that allows both user inserts AND trigger inserts
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id OR  -- Normal user insert
    auth.uid() IS NULL       -- Allow trigger insert (auth.uid() is NULL in trigger context)
  );

-- Verify the trigger function exists and is correct
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 