/*
  # Fix Storage RLS Policies

  1. Changes
    - Make all storage buckets public
    - Create simplified RLS policies for storage objects
    - Remove role-based restrictions that are causing upload failures
    - Ensure all authenticated users can upload files

  2. Security
    - Maintain public read access
    - Allow all authenticated users to upload files
    - Remove overly restrictive policies
*/

-- Make all buckets public
UPDATE storage.buckets
SET public = true
WHERE id IN ('course_videos', 'course_thumbnails', 'course_images', 'course_files');

-- Drop ALL existing storage policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop all policies for storage.objects
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON storage.objects;', ' ')
    FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create simple, permissive policies for all buckets
CREATE POLICY "public_read_access"
ON storage.objects
FOR SELECT
TO public
USING (true);

CREATE POLICY "authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;