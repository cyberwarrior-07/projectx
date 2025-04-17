/*
  # Update lessons table RLS policies

  1. Changes
    - Add new RLS policy for lesson reordering
    - Update existing instructor policy to include order_position updates
    - Ensure proper permission checks for both instructors and admins

  2. Security
    - Maintain existing RLS policies
    - Add specific policy for order_position updates
    - Ensure only instructors and admins can modify their course lessons
*/

-- First, drop the existing ALL policy for instructors since we'll recreate it
DROP POLICY IF EXISTS "Instructors can manage course lessons" ON lessons;

-- Create a comprehensive policy for instructors to manage their course lessons
CREATE POLICY "Instructors can manage course lessons"
ON lessons
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = lessons.course_id
    AND (
      courses.instructor_id = auth.uid() OR
      EXISTS (
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
      courses.instructor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
);

-- Add a specific policy for updating lesson order
CREATE POLICY "Allow lesson reordering"
ON lessons
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = lessons.course_id
    AND (
      courses.instructor_id = auth.uid() OR
      EXISTS (
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
      courses.instructor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
);