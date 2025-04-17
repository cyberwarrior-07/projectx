/*
  # Add email column to profiles table

  1. Changes
    - Add email column to profiles table (initially nullable)
    - Update existing profiles with emails from auth.users
    - Make email column required and unique
    - Add index on email column for faster lookups

  This migration handles existing data by:
    1. Adding the column as nullable first
    2. Populating data from auth.users
    3. Then making it NOT NULL
*/

-- First add the column as nullable
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email text;

-- Update existing profiles with their emails from auth.users
DO $$
BEGIN
  UPDATE profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id;
END $$;

-- Now make it NOT NULL after data is populated
ALTER TABLE profiles
ALTER COLUMN email SET NOT NULL;

-- Add unique constraint
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);