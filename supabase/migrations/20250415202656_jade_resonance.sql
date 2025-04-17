/*
  # Update RLS policies for storage and lessons

  1. Changes
    - Add storage bucket policies for course_videos
    - Update lessons table policies to handle lesson creation
    - Add policies for instructors and admins

  2. Security
    - Enable RLS on storage buckets
    - Add policies to check user roles and course ownership
    - Allow admins full access
*/

-- Enable RLS for storage buckets
ALTER POLICY "Allow instructors to manage course videos" ON storage.objects
USING (
  bucket_id = 'course_videos' AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

-- Add storage bucket policy for video uploads
CREATE POLICY "Allow video uploads by instructors and admins" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course_videos' AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  )
);

-- Update lessons table policies
DROP POLICY IF EXISTS "instructors_can_manage_lessons" ON public.lessons;

CREATE POLICY "instructors_can_manage_lessons" ON public.lessons
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
    AND (
      courses.instructor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
    AND (
      courses.instructor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
);

-- Add policy for lesson viewing
DROP POLICY IF EXISTS "lessons_viewable_by_everyone" ON public.lessons;

CREATE POLICY "lessons_viewable_by_everyone" ON public.lessons
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
    AND (
      courses.visibility = 'public'
      OR EXISTS (
        SELECT 1 FROM public.progress
        WHERE progress.course_id = courses.id
        AND progress.user_id = auth.uid()
      )
      OR courses.instructor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
);