/*
  # Fix Authentication System

  1. Changes
    - Clean up existing data with proper dependency handling
    - Create fresh admin user
    - Update RLS policies
    - Fix profile trigger

  2. Security
    - Enable RLS on all tables
    - Add proper policies for user access
*/

-- First clean up existing data in the correct order
DO $$ 
DECLARE
  v_admin_id uuid := 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
  v_existing_profile_id uuid;
BEGIN
  -- First find if there's an existing admin user
  SELECT id INTO v_existing_profile_id
  FROM profiles
  WHERE email = 'admin@admin.com'
  AND id != v_admin_id;

  -- If there's an existing admin user with a different ID, migrate the data
  IF v_existing_profile_id IS NOT NULL THEN
    -- Update foreign key references to use new ID
    UPDATE progress SET user_id = v_admin_id WHERE user_id = v_existing_profile_id;
    UPDATE code_executions SET user_id = v_admin_id WHERE user_id = v_existing_profile_id;
    UPDATE grades SET user_id = v_admin_id WHERE user_id = v_existing_profile_id;
    
    -- Delete old profile and auth user
    DELETE FROM profiles WHERE id = v_existing_profile_id;
    DELETE FROM auth.users WHERE id = v_existing_profile_id;
  END IF;

  -- Delete non-admin users and their data
  DELETE FROM progress WHERE user_id IN (
    SELECT id FROM profiles WHERE email != 'admin@admin.com'
  );
  DELETE FROM code_executions WHERE user_id IN (
    SELECT id FROM profiles WHERE email != 'admin@admin.com'
  );
  DELETE FROM grades WHERE user_id IN (
    SELECT id FROM profiles WHERE email != 'admin@admin.com'
  );
  DELETE FROM profiles WHERE email != 'admin@admin.com';
  DELETE FROM auth.users WHERE email != 'admin@admin.com';

  -- Create or update admin user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    deleted_at,
    invited_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@admin.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin"}'::jsonb,
    now(),
    now(),
    false,
    null,
    null,
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    updated_at = now();

  -- Create or update admin profile
  INSERT INTO profiles (
    id,
    email,
    role,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    v_admin_id,
    'admin@admin.com',
    'admin',
    'Admin User',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  -- Verify setup
  IF NOT EXISTS (
    SELECT 1 
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE u.email = 'admin@admin.com'
    AND p.role = 'admin'
    AND u.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Failed to setup admin user properly';
  END IF;
END $$;

-- Update handle_new_user function to properly handle student sign-ups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Don't create profile for admin user (already created)
  IF NEW.email = 'admin@admin.com' THEN
    RETURN NEW;
  END IF;

  -- Create student profile for new sign-ups
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    'student',
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    now(),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON profiles;
DROP POLICY IF EXISTS "Allow public read access" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow admin full access" ON profiles;
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_policy" ON profiles;
DROP POLICY IF EXISTS "allow_read_all" ON profiles;
DROP POLICY IF EXISTS "allow_update_own" ON profiles;
DROP POLICY IF EXISTS "allow_admin_all" ON profiles;

-- Create new policies
CREATE POLICY "allow_read_all"
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