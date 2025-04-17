/*
  # Update lessons table RLS policies

  1. Changes
    - Add new RLS policy for lesson order updates
    - Modify existing policies to properly handle course management
    - Ensure proper authorization checks for instructors and admins

  2. Security
    - Enable RLS on lessons table
    - Add policies for:
      - Lesson order management
      - Course content management
      - General lesson access
*/

-- First, disable existing policies to avoid conflicts
DROP POLICY IF EXISTS "Instructors can manage course lessons" ON lessons;
DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON lessons;

-- Create comprehensive policies for lesson management
CREATE POLICY "instructors_manage_lessons"
ON lessons
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

-- Policy for viewing lessons
CREATE POLICY "lessons_viewable_by_everyone"
ON lessons
FOR SELECT
TO public
USING (true);

-- Policy specifically for updating lesson order
CREATE POLICY "update_lesson_order"
ON lessons
FOR UPDATE
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