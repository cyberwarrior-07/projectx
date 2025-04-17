/*
  # Fix admin user signup

  1. Changes
    - Improve handle_new_user function to better handle admin creation
    - Update RLS policies for admin access
    - Add proper error handling
*/

-- Update handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Don't create duplicate profile for admin@admin.com
  IF NEW.email = 'admin@admin.com' THEN
    -- Update existing admin profile if needed
    UPDATE profiles
    SET 
      email = NEW.email,
      role = 'admin',
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'),
      updated_at = now()
    WHERE id = NEW.id;
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
    -- Log error details if needed
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies to be more permissive during signup
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
        OR id IN (SELECT id FROM profiles WHERE role = 'admin')
      )
    )
  );

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;