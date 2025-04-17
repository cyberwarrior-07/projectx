/*
  # Update RLS policies for lessons and storage

  1. Changes
    - Add storage policies for course_videos, course_images, course_files, course_thumbnails buckets
    - Update lessons table policies to allow instructors and admins to manage lessons
    - Add explicit insert policy for lessons table

  2. Security
    - Enable RLS on storage buckets
    - Add policies for authenticated users with instructor or admin roles
    - Ensure course ownership validation
*/

-- Enable RLS on storage buckets
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies for course_videos bucket
CREATE POLICY "Allow instructors and admins to upload course videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course_videos' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

CREATE POLICY "Allow instructors and admins to update course videos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course_videos' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

CREATE POLICY "Allow everyone to view course videos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_videos');

-- Create storage policies for course_images bucket
CREATE POLICY "Allow instructors and admins to upload course images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course_images' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

CREATE POLICY "Allow instructors and admins to update course images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course_images' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

CREATE POLICY "Allow everyone to view course images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_images');

-- Create storage policies for course_files bucket
CREATE POLICY "Allow instructors and admins to upload course files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course_files' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

CREATE POLICY "Allow instructors and admins to update course files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course_files' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

CREATE POLICY "Allow everyone to view course files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_files');

-- Create storage policies for course_thumbnails bucket
CREATE POLICY "Allow instructors and admins to upload course thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course_thumbnails' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

CREATE POLICY "Allow instructors and admins to update course thumbnails"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course_thumbnails' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

CREATE POLICY "Allow everyone to view course thumbnails"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course_thumbnails');

-- Update lessons table policies
DROP POLICY IF EXISTS "instructors_can_create_lessons" ON lessons;
DROP POLICY IF EXISTS "instructors_manage_own_course_lessons" ON lessons;

-- Create new policies for lessons table
CREATE POLICY "instructors_can_manage_lessons"
ON lessons
FOR ALL TO authenticated
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

-- Add explicit insert policy for new lessons
CREATE POLICY "instructors_can_create_new_lessons"
ON lessons
FOR INSERT TO authenticated
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