/*
  # Fix RLS policies for lesson creation and video uploads

  1. Changes
    - Update RLS policies for lessons table to allow instructors to create lessons
    - Add storage bucket policies for course_videos

  2. Security
    - Ensure instructors can only create lessons for their own courses
    - Allow instructors to upload videos to course_videos bucket
    - Maintain existing read permissions
*/

-- First, ensure the storage bucket exists and has RLS enabled
INSERT INTO storage.buckets (id, name, public)
VALUES ('course_videos', 'course_videos', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to course videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow instructors to upload course videos" ON storage.objects;

-- Create storage policies
CREATE POLICY "Allow public read access to course videos"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'course_videos'
  AND (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.lessons l ON l.course_id = c.id
      WHERE l.video_url LIKE '%' || name
      AND (
        c.visibility = 'public'
        OR EXISTS (
          SELECT 1 FROM public.progress p
          WHERE p.course_id = c.id
          AND p.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Allow instructors to upload course videos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'course_videos'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

-- Update lessons table policies
DROP POLICY IF EXISTS "instructors_manage_own_course_lessons" ON public.lessons;

CREATE POLICY "instructors_manage_own_course_lessons"
ON public.lessons
TO public
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