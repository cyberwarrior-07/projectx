/*
  # Fix Storage Bucket Policies

  1. Changes
    - Create storage buckets
    - Add proper RLS policies
    - Fix operator error in storage.foldername
    - Add proper type casting

  2. Security
    - Enable RLS
    - Add proper access controls
    - Fix policy syntax
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('course_videos', 'course_videos', false),
  ('course_thumbnails', 'course_thumbnails', false),
  ('course_files', 'course_files', false),
  ('course_images', 'course_images', false),
  ('course_content', 'course_content', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow instructors to manage course videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to manage course thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to manage course files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course files" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to manage course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to manage course content" ON storage.objects;
DROP POLICY IF EXISTS "Allow enrolled students to view course content" ON storage.objects;

-- Create comprehensive policies for course_videos bucket
CREATE POLICY "Allow instructors to manage course videos"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'course_videos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_videos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
);

CREATE POLICY "Allow public read access to course videos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_videos');

-- Create policies for course_thumbnails bucket
CREATE POLICY "Allow instructors to manage course thumbnails"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'course_thumbnails'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_thumbnails'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
);

CREATE POLICY "Allow public read access to course thumbnails"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_thumbnails');

-- Create policies for course_files bucket
CREATE POLICY "Allow instructors to manage course files"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'course_files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
);

CREATE POLICY "Allow public read access to course files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_files');

-- Create policies for course_images bucket
CREATE POLICY "Allow instructors to manage course images"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'course_images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
);

CREATE POLICY "Allow public read access to course images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_images');

-- Create policies for course_content bucket
CREATE POLICY "Allow instructors to manage course content"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'course_content'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
)
WITH CHECK (
  bucket_id = 'course_content'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'instructor' OR role = 'admin')
  )
);

CREATE POLICY "Allow enrolled students to view course content"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course_content'
  AND EXISTS (
    SELECT 1 FROM progress p
    JOIN lessons l ON l.id = p.lesson_id
    WHERE p.user_id = auth.uid()
    AND split_part(name, '/', 1) = l.course_id::text
  )
);

-- Update lessons table policies
DROP POLICY IF EXISTS "instructors_can_manage_lessons" ON lessons;
DROP POLICY IF EXISTS "instructors_can_create_new_lessons" ON lessons;
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