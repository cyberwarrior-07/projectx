/*
  # Fix Storage Policies for Video Access

  1. Changes
    - Update storage bucket policies to allow public access
    - Fix RLS policies for video uploads and access
    - Ensure proper permissions for all users
*/

-- Make all buckets public
UPDATE storage.buckets
SET public = true
WHERE id IN ('course_videos', 'course_thumbnails', 'course_images', 'course_files');

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "allow_public_read_access" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;

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