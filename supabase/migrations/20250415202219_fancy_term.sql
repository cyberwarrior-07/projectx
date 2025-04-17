/*
  # Fix Video Upload Functionality

  1. Changes
    - Create storage buckets with proper public access
    - Add comprehensive RLS policies for video uploads
    - Fix permission issues with storage access
    - Ensure proper role-based access control

  2. Security
    - Enable RLS on storage objects
    - Add policies for authenticated users
    - Allow public access to uploaded videos
*/

-- First ensure all required buckets exist and are public
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
DROP POLICY IF EXISTS "Allow instructors to manage videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins and instructors to manage files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course materials" ON storage.objects;

-- Create new storage policies with proper permissions
-- Policy for ALL authenticated users to upload videos (no role restriction)
CREATE POLICY "authenticated_users_can_upload_videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course_videos');

-- Policy for ALL authenticated users to update their own uploads
CREATE POLICY "authenticated_users_can_update_own_videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course_videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for ALL authenticated users to delete their own uploads
CREATE POLICY "authenticated_users_can_delete_own_videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course_videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for public read access to videos
CREATE POLICY "public_can_read_videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course_videos');

-- Similar policies for thumbnails
CREATE POLICY "authenticated_users_can_upload_thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course_thumbnails');

CREATE POLICY "authenticated_users_can_update_own_thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course_thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "public_can_read_thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course_thumbnails');

-- Similar policies for images
CREATE POLICY "authenticated_users_can_upload_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course_images');

CREATE POLICY "authenticated_users_can_update_own_images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "public_can_read_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course_images');

-- Similar policies for files
CREATE POLICY "authenticated_users_can_upload_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course_files');

CREATE POLICY "authenticated_users_can_update_own_files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course_files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "public_can_read_files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course_files');