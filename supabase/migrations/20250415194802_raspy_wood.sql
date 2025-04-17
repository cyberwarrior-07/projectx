/*
  # Fix Storage RLS and Bucket Setup

  1. Changes
    - Create storage buckets with proper settings
    - Fix RLS policies for file uploads
    - Add proper role-based access control
    - Ensure proper bucket permissions
*/

-- First create all required buckets
DO $$ 
BEGIN
  -- Create buckets if they don't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES 
    ('course_videos', 'course_videos', true),
    ('course_thumbnails', 'course_thumbnails', true),
    ('course_files', 'course_files', true),
    ('course_images', 'course_images', true)
  ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public;

  -- Enable RLS
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
END $$;

-- Drop all existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow instructors to manage videos" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to videos" ON storage.objects;
  DROP POLICY IF EXISTS "Allow instructors to manage thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Allow instructors to manage files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow instructors to manage images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create new storage policies with proper permissions
CREATE POLICY "Allow instructors to manage videos"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  bucket_id = 'course_videos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('instructor', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_videos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('instructor', 'admin')
  )
);

CREATE POLICY "Allow public read access to videos"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'course_videos');

CREATE POLICY "Allow instructors to manage thumbnails"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  bucket_id = 'course_thumbnails'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('instructor', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_thumbnails'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('instructor', 'admin')
  )
);

CREATE POLICY "Allow public read access to thumbnails"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'course_thumbnails');

CREATE POLICY "Allow instructors to manage files"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  bucket_id = 'course_files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('instructor', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('instructor', 'admin')
  )
);

CREATE POLICY "Allow public read access to files"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'course_files');

CREATE POLICY "Allow instructors to manage images"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  bucket_id = 'course_images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('instructor', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('instructor', 'admin')
  )
);

CREATE POLICY "Allow public read access to images"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'course_images');

-- Update lessons table policies
DROP POLICY IF EXISTS "instructors_can_manage_lessons" ON lessons;
DROP POLICY IF EXISTS "lessons_viewable_by_everyone" ON lessons;

CREATE POLICY "lessons_viewable_by_everyone"
ON lessons
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

CREATE POLICY "instructors_can_manage_lessons"
ON lessons
AS PERMISSIVE
FOR ALL
TO authenticated
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

-- Add function to handle video deletion
CREATE OR REPLACE FUNCTION handle_lesson_delete()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete associated video file if it exists
  IF OLD.video_url IS NOT NULL THEN
    -- Extract filename from video_url
    DECLARE
      filename text := substring(OLD.video_url from '[^/]+$');
    BEGIN
      IF filename IS NOT NULL THEN
        PERFORM storage.delete('course_videos', filename);
      END IF;
    END;
  END IF;
  RETURN OLD;
END;
$$;

-- Create trigger for video cleanup
DROP TRIGGER IF EXISTS lesson_delete_trigger ON lessons;
CREATE TRIGGER lesson_delete_trigger
  AFTER DELETE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION handle_lesson_delete();