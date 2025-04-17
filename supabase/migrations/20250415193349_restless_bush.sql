/*
  # Fix storage policies for file uploads

  1. Changes
    - Create storage buckets if they don't exist
    - Enable RLS on storage objects
    - Create policies for file uploads and access
    - Update lesson and course policies
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('course_videos', 'course_videos', false),
  ('course_thumbnails', 'course_thumbnails', false),
  ('course_files', 'course_files', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow instructors to upload course videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to upload course thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to upload course files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course files" ON storage.objects;

-- Create policies for course videos
CREATE POLICY "Allow instructors to upload course videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course_videos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
);

CREATE POLICY "Allow public read access to course videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course_videos');

-- Create policies for course thumbnails
CREATE POLICY "Allow instructors to upload course thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course_thumbnails'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
);

CREATE POLICY "Allow public read access to course thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course_thumbnails');

-- Create policies for course files
CREATE POLICY "Allow instructors to upload course files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course_files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
);

CREATE POLICY "Allow public read access to course files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course_files');

-- Update lessons table policies
DROP POLICY IF EXISTS "instructors_manage_own_course_lessons" ON lessons;
CREATE POLICY "instructors_manage_own_course_lessons" ON lessons
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = lessons.course_id
    AND (
      courses.instructor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = lessons.course_id
    AND (
      courses.instructor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
);

-- Add policy for creating new lessons
DROP POLICY IF EXISTS "instructors_can_create_lessons" ON lessons;
CREATE POLICY "instructors_can_create_lessons" ON lessons
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'instructor' OR profiles.role = 'admin')
  )
);

-- Ensure courses table has proper RLS policies
DROP POLICY IF EXISTS "instructors_can_manage_courses" ON courses;
CREATE POLICY "instructors_can_manage_courses" ON courses
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'instructor' OR profiles.role = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'instructor' OR profiles.role = 'admin')
  )
);