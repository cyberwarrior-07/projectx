/*
  # Fix Profile Permissions

  1. Changes
    - Drop existing policies
    - Create new comprehensive RLS policies
    - Add proper indexes
    - Set up proper foreign key relationships

  2. Security
    - Enable RLS
    - Add policies for authenticated and public access
    - Ensure proper permission checks
*/

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "allow_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "allow_read" ON public.profiles;
DROP POLICY IF EXISTS "allow_read_all" ON public.profiles;
DROP POLICY IF EXISTS "allow_update_own" ON public.profiles;

-- Create comprehensive policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Ensure foreign key relationship with auth.users
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;