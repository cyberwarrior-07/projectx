/*
  # Fix Admin Authentication

  1. Changes
    - Properly sets up admin user in auth.users
    - Ensures profile exists and is linked correctly
    - Updates RLS policies to fix recursion issues
    - Adds proper role-based access control
*/

-- First clean up any existing admin records
DO $$ 
DECLARE
  v_user_id uuid := 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
BEGIN
  -- First try to create auth user
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin"}'::jsonb,
      now(),
      now()
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Update existing user
      UPDATE auth.users
      SET 
        email = 'admin@example.com',
        encrypted_password = crypt('admin123', gen_salt('bf')),
        raw_user_meta_data = '{"role":"admin"}'::jsonb,
        updated_at = now()
      WHERE id = v_user_id;
  END;

  -- Then try to update profile
  UPDATE profiles
  SET 
    email = 'admin@example.com',
    role = 'admin',
    full_name = 'Admin User'
  WHERE id = v_user_id;

  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO profiles (
      id,
      email,
      role,
      full_name
    ) VALUES (
      v_user_id,
      'admin@example.com',
      'admin',
      'Admin User'
    );
  END IF;
END $$;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_policy" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON profiles;

-- Create new simplified policies
CREATE POLICY "allow_read"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "allow_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "allow_admin_all"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );