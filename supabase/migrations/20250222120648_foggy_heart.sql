/*
  # Fix admin user setup

  1. Changes
    - Update admin user and profile handling
    - Ensure proper order of operations
    - Fix foreign key constraints
*/

-- First ensure the admin user exists in auth.users
DO $$ 
BEGIN
  -- Update existing admin profile if exists
  UPDATE profiles
  SET role = 'admin'
  WHERE id = 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';

  -- Update existing auth user if exists
  UPDATE auth.users
  SET 
    email = 'admin@example.com',
    encrypted_password = crypt('admin123', gen_salt('bf')),
    raw_user_meta_data = '{"role":"admin"}'::jsonb,
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    updated_at = now()
  WHERE id = 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
END $$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) THEN
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
  END IF;
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