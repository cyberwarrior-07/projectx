/*
  # Fix authentication flow

  1. Changes
    - Simplify auth flow by removing role selection
    - Keep admin credentials in database
    - Update RLS policies
*/

-- First clean up any existing admin data
DELETE FROM profiles WHERE email = 'admin@admin.com';
DELETE FROM auth.users WHERE email = 'admin@admin.com';

-- Create admin user with fixed credentials
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
  'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1',
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
);

-- Create admin profile
INSERT INTO profiles (
  id,
  email,
  role,
  full_name,
  created_at,
  updated_at
) VALUES (
  'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1',
  'admin@admin.com',
  'admin',
  'Admin User',
  now(),
  now()
);

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Skip profile creation for admin user
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
DROP POLICY IF EXISTS "allow_admin_all" ON profiles;
CREATE POLICY "allow_admin_all"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email = 'admin@admin.com'
    )
  );

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;