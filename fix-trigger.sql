-- Fix the database trigger to bypass RLS policies
-- This is the corrected version that will work with Row Level Security

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the corrected function that bypasses RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- This runs with elevated privileges
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table bypassing RLS
  INSERT INTO public.profiles (user_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Alternative: Create a more permissive RLS policy for the trigger
-- This policy allows the trigger to insert profiles
CREATE POLICY "Allow trigger to insert profiles" ON profiles
  FOR INSERT 
  WITH CHECK (true); -- This allows the trigger to insert

-- Make sure the trigger policy has higher priority
-- by recreating the user policies with more specific conditions
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL); 