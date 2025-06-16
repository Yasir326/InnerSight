-- Temporarily disable the trigger that's causing signup failures
-- We'll handle profile creation in the app code instead

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function but don't auto-execute it
-- CREATE OR REPLACE FUNCTION handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Function kept for potential future use
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS policies allow manual profile creation
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add a policy to allow profile creation right after signup
CREATE POLICY "Allow profile creation after signup" ON profiles
  FOR INSERT WITH CHECK (true);

-- We'll handle this in app code after successful signup 