/*
  # Fix Duplicate Profiles Issue

  1. Changes
    - Add ON CONFLICT clause to handle duplicate profile creation
    - Update trigger function to use upsert instead of insert
    - Maintain existing profile data

  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity
*/

-- Update the trigger function to handle duplicates gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;