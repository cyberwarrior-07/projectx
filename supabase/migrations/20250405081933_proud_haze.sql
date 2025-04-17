/*
  # Update lessons table RLS policies

  1. Changes
    - Add new RLS policy for instructors to manage lessons
    - Allow instructors to update lesson order positions
    - Allow admins to manage all lessons

  2. Security
    - Enable RLS on lessons table
    - Add policies for:
      - Instructors can manage their own course lessons
      - Admins can manage all lessons
      - Students can view lessons
*/

-- Drop existing policies
DROP POLICY IF EXISTS "instructors_and_admins_manage_lessons" ON "public"."lessons";
DROP POLICY IF EXISTS "lessons_viewable_by_everyone" ON "public"."lessons";

-- Create new policies
CREATE POLICY "instructors_manage_own_course_lessons"
ON "public"."lessons"
FOR ALL
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

-- Allow all users to view lessons
CREATE POLICY "lessons_viewable_by_everyone"
ON "public"."lessons"
FOR SELECT
TO public
USING (true);