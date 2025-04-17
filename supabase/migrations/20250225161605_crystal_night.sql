/*
  # Fix admin authentication

  1. Changes
    - Ensure admin user exists with correct credentials
    - Update RLS policies for admin access
    - Add proper error handling for auth
*/

-- First clean up any existing admin users to avoid conflicts
DO $$ 
DECLARE
  v_admin_id uuid := 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
BEGIN
  -- Delete any duplicate admin accounts
  DELETE FROM auth.users 
  WHERE email = 'admin@admin.com' 
  AND id != v_admin_id;

  -- Create or update the admin user
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
  ) THEN
    RAISE EXCEPTION 'Failed to setup admin user properly';
  END IF;
END $$;

-- Update handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Don't create duplicate profile for admin@admin.com
  IF NEW.email = 'admin@admin.com' THEN
    RETURN NEW;
  END IF;

  -- For all other users, create or update profile
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
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
      ELSE 'student'
    END,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
      ELSE profiles.role
    END,
    full_name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      profiles.full_name
    ),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies
DROP POLICY IF EXISTS "allow_admin_all" ON profiles;
CREATE POLICY "allow_admin_all"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        raw_user_meta_data->>'role' = 'admin'
        OR email = 'admin@admin.com'
      )
    )
  );

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;