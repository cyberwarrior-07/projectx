/*
  # Fix Admin Authentication

  1. Changes
    - Create admin user with proper metadata
    - Update policies for admin access
*/

-- First ensure the admin user exists in auth.users
DO $$ 
BEGIN
  -- Only insert if admin doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@example.com'
  ) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- Ensure admin profile exists
DO $$ 
BEGIN
  -- Only insert if profile doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE email = 'admin@example.com'
  ) THEN
    INSERT INTO profiles (
      id,
      email,
      role,
      full_name
    ) VALUES (
      'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1'::uuid,
      'admin@example.com',
      'admin',
      'Admin User'
    );
  END IF;
END $$;

-- Update handle_new_user function to properly handle admin role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name
  ) VALUES (
    NEW.id,
    NEW.email,
    (CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role 
      ELSE 'student'::user_role 
    END),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update policies to use raw_user_meta_data for role checks
DROP POLICY IF EXISTS "Admin full access" ON profiles;
CREATE POLICY "Admin full access"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );