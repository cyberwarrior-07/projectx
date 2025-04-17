/*
  # Sync CMS and LMS

  1. Changes
    - Add scheduled_date column to courses table
    - Add visibility column for course access control
    - Add indexes for better performance
    - Update RLS policies for proper access control

  2. Security
    - Enable RLS on all tables
    - Add proper access policies
    - Ensure data integrity
*/

-- Add scheduled_date column if it doesn't exist
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS scheduled_date timestamptz;

-- Add visibility column if it doesn't exist
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_scheduled_date 
ON courses(scheduled_date) 
WHERE scheduled_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_visibility 
ON courses(visibility);

-- Update RLS policies for courses
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON courses;
DROP POLICY IF EXISTS "Instructors can create courses" ON courses;
DROP POLICY IF EXISTS "Instructors can update own courses" ON courses;

-- Create comprehensive policies
CREATE POLICY "Public courses are viewable by everyone"
ON courses FOR SELECT
USING (
  visibility = 'public' 
  OR EXISTS (
    SELECT 1 FROM progress 
    WHERE progress.course_id = courses.id 
    AND progress.user_id = auth.uid()
  )
);

CREATE POLICY "Instructors can manage own courses"
ON courses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'instructor' 
      OR profiles.role = 'admin'
    )
  )
  AND (
    instructor_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  )
);

-- Add function to check course access
CREATE OR REPLACE FUNCTION check_course_access(course_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = course_id
    AND (
      c.visibility = 'public'
      OR EXISTS (
        SELECT 1 FROM progress p
        WHERE p.course_id = c.id
        AND p.user_id = user_id
      )
      OR EXISTS (
        SELECT 1 FROM profiles pr
        WHERE pr.id = user_id
        AND (
          pr.role = 'instructor'
          OR pr.role = 'admin'
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to handle course scheduling
CREATE OR REPLACE FUNCTION handle_course_scheduling()
RETURNS trigger AS $$
BEGIN
  -- If scheduled date is in the past, make course public
  IF NEW.scheduled_date IS NOT NULL AND NEW.scheduled_date <= now() THEN
    NEW.visibility := 'public';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for course scheduling
DROP TRIGGER IF EXISTS course_scheduling_trigger ON courses;
CREATE TRIGGER course_scheduling_trigger
  BEFORE INSERT OR UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION handle_course_scheduling();

-- Add function to sync lesson content with progress
CREATE OR REPLACE FUNCTION sync_lesson_content()
RETURNS trigger AS $$
BEGIN
  -- Update progress for all enrolled students when lesson content changes
  IF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
    UPDATE progress
    SET 
      last_content_version = (
        SELECT id FROM content_versions 
        WHERE lesson_id = NEW.id 
        ORDER BY version_number DESC 
        LIMIT 1
      ),
      updated_at = now()
    WHERE lesson_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for lesson content syncing
DROP TRIGGER IF EXISTS lesson_content_sync_trigger ON lessons;
CREATE TRIGGER lesson_content_sync_trigger
  AFTER UPDATE ON lessons
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION sync_lesson_content();

-- Add storage bucket for course content if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course_content', 'course_content', false)
ON CONFLICT (id) DO NOTHING;

-- Add policy for course content access
CREATE POLICY "Allow course content access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'course_content'
  AND (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id::text = SPLIT_PART(name, '/', 1)
      AND check_course_access(c.id, auth.uid())
    )
  )
);