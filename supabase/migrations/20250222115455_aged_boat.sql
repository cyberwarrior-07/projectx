/*
  # Fix admin user creation

  1. Changes
    - Safely handle existing admin records
    - Create admin user if not exists
    - Update policies for proper role handling
*/

-- First check and handle existing records
DO $$ 
BEGIN
  -- Check if admin exists in profiles
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1'
  ) THEN
    -- Update existing admin profile
    UPDATE profiles
    SET 
      email = 'admin@example.com',
      role = 'admin',
      full_name = 'Admin User'
    WHERE id = 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
  ELSE
    -- Create new admin profile
    INSERT INTO profiles (
      id,
      email,
      role,
      full_name
    ) VALUES (
      'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1',
      'admin@example.com',
      'admin',
      'Admin User'
    );
  END IF;

  -- Check if admin exists in auth.users
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1'
  ) THEN
    -- Update existing auth user
    UPDATE auth.users
    SET 
      email = 'admin@example.com',
      encrypted_password = crypt('admin123', gen_salt('bf')),
      raw_user_meta_data = '{"role":"admin"}'::jsonb,
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      updated_at = now()
    WHERE id = 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
  ELSE
    -- Create new auth user
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
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1',
      '00000000-0000-0000-0000-000000000000',
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
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

-- Update handle_new_user function
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
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'student'::user_role
    ),
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

-- Update policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin full access"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );