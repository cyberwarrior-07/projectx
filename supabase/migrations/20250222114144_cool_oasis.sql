/*
  # Fix admin authentication and authorization

  1. Changes
    - Update RLS policies for admin access
    - Fix role handling in profile creation
    - Add admin-specific functions and policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins have full access" ON profiles;

-- Create new policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own profile"
  ON profiles 
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update handle_new_user function to properly handle admin role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_role user_role;
BEGIN
  -- Get role from metadata, defaulting to student if not specified
  new_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'student'
  );

  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name
  ) VALUES (
    NEW.id,
    NEW.email,
    new_role,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;