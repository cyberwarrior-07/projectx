/*
  # Fix Lesson Management Policies

  1. Changes
    - Drop existing policies
    - Create new policies for lesson management
    - Fix syntax errors in policy creation
    - Ensure proper access control

  2. Security
    - Maintain RLS
    - Preserve existing access patterns
    - Fix policy syntax
*/

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "update_lesson_order" ON lessons;
DROP POLICY IF EXISTS "instructors_manage_lessons" ON lessons;
DROP POLICY IF EXISTS "lessons_viewable_by_everyone" ON lessons;

-- Create comprehensive policy for lesson management
CREATE POLICY "instructors_and_admins_manage_lessons" ON lessons
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN profiles p ON p.id = auth.uid()
    WHERE 
      c.id = lessons.course_id 
      AND (
        c.instructor_id = auth.uid()
        OR p.role = 'admin'
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN profiles p ON p.id = auth.uid()
    WHERE 
      c.id = lessons.course_id 
      AND (
        c.instructor_id = auth.uid()
        OR p.role = 'admin'
      )
  )
);

-- Create policy for viewing lessons (without IF NOT EXISTS)
CREATE POLICY "lessons_viewable_by_everyone" ON lessons
FOR SELECT TO public
USING (true);