/*
  # Fix User Signup Process

  1. Changes
    - Fix handle_new_user function to properly create profiles
    - Update RLS policies to allow profile creation during signup
    - Add proper error handling for the signup process
    - Ensure proper role assignment for new users

  2. Security
    - Maintain existing RLS policies
    - Ensure proper data isolation
*/

-- First, fix the handle_new_user function to properly handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_role user_role := 'student';
  user_full_name text;
BEGIN
  -- Extract full name from metadata or use email username as fallback
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Insert profile with proper error handling
  BEGIN
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
      default_role,
      user_full_name,
      now(),
      now()
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- If profile already exists, update it
      UPDATE public.profiles
      SET 
        email = NEW.email,
        full_name = user_full_name,
        updated_at = now()
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      -- Log other errors but don't fail the transaction
      RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies to ensure users can create their own profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add policy for profile creation during signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
CREATE POLICY "Allow profile creation during signup"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ensure email column is properly set up
DO $$ 
BEGIN
  -- Make sure email column exists and has proper constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text NOT NULL;
  END IF;

  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles' AND column_name = 'email'
    AND constraint_name = 'profiles_email_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- Create index for email lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;