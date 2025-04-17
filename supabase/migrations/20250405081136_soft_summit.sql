/*
  # Update lessons table RLS policies

  1. Changes
    - Add new RLS policy to allow lesson reordering for instructors and admins
    - Policy checks for instructor ownership of course or admin role
    - Ensures proper authorization for updating lesson order

  2. Security
    - Maintains RLS enabled on lessons table
    - Adds specific policy for order_position updates
    - Preserves existing security policies
*/

-- Drop existing reordering policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lessons' 
    AND policyname = 'Allow lesson reordering'
  ) THEN
    DROP POLICY "Allow lesson reordering" ON public.lessons;
  END IF;
END $$;

-- Create new policy for lesson reordering
CREATE POLICY "Allow lesson reordering" ON public.lessons
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
        AND profiles.role = 'admin'::user_role
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
        AND profiles.role = 'admin'::user_role
      )
    )
  )
);