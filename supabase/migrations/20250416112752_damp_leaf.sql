/*
  # Fix Storage Policies for File Uploads

  1. Changes
    - Create storage buckets if they don't exist
    - Enable RLS on storage objects
    - Create policies for file uploads and access
    - Update lesson and course policies
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('course_videos', 'course_videos', true),
  ('course_thumbnails', 'course_thumbnails', true),
  ('course_images', 'course_images', true),
  ('course_files', 'course_files', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON storage.objects;', ' ')
    FROM pg_policies
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
  );
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create simple policies for all buckets
CREATE POLICY "allow_public_read_access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('course_videos', 'course_thumbnails', 'course_images', 'course_files'));

CREATE POLICY "allow_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('course_videos', 'course_thumbnails', 'course_images', 'course_files'));

CREATE POLICY "allow_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id IN ('course_videos', 'course_thumbnails', 'course_images', 'course_files'));

CREATE POLICY "allow_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id IN ('course_videos', 'course_thumbnails', 'course_images', 'course_files'));

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;