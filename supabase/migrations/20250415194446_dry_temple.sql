/*
  # Fix Storage Policies and Bucket Setup

  1. Changes
    - Create all required storage buckets
    - Enable RLS on storage objects
    - Add proper policies for each bucket
    - Fix lesson management policies
*/

-- Create all required storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('course_videos', 'course_videos', false),
  ('course_thumbnails', 'course_thumbnails', false),
  ('course_files', 'course_files', false),
  ('course_images', 'course_images', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow instructors to manage videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to manage thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to manage files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to files" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to manage images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;

-- Create policies for course_videos bucket
CREATE POLICY "Allow instructors to manage videos"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'course_videos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_videos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
  )
);

CREATE POLICY "Allow public read access to videos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_videos');

-- Create policies for course_thumbnails bucket
CREATE POLICY "Allow instructors to manage thumbnails"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'course_thumbnails'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_thumbnails'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
  )
);

CREATE POLICY "Allow public read access to thumbnails"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_thumbnails');

-- Create policies for course_files bucket
CREATE POLICY "Allow instructors to manage files"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'course_files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
  )
);

CREATE POLICY "Allow public read access to files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_files');

-- Create policies for course_images bucket
CREATE POLICY "Allow instructors to manage images"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'course_images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
  )
);

CREATE POLICY "Allow public read access to images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_images');

-- Update lessons table policies
DROP POLICY IF EXISTS "instructors_can_manage_lessons" ON lessons;
DROP POLICY IF EXISTS "lessons_viewable_by_everyone" ON lessons;

-- Create comprehensive lesson policies
CREATE POLICY "lessons_viewable_by_everyone"
ON lessons FOR SELECT
TO public
USING (true);

CREATE POLICY "instructors_can_manage_lessons"
ON lessons FOR ALL
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
        AND role = 'admin'
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
        AND role = 'admin'
      )
    )
  )
);

-- Add function to handle video deletion
CREATE OR REPLACE FUNCTION handle_lesson_delete()
RETURNS trigger AS $$
BEGIN
  -- Delete associated video file if it exists
  IF OLD.video_url IS NOT NULL THEN
    -- Extract filename from video_url
    DECLARE
      filename text := split_part(OLD.video_url, '/', -1);
    BEGIN
      IF filename IS NOT NULL THEN
        PERFORM storage.delete('course_videos', filename);
      END IF;
    END;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for video cleanup
DROP TRIGGER IF EXISTS lesson_delete_trigger ON lessons;
CREATE TRIGGER lesson_delete_trigger
  AFTER DELETE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION handle_lesson_delete();