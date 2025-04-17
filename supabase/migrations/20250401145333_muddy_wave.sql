/*
  # Enhance Course Management System

  1. Changes
    - Add video storage bucket
    - Add video metadata tracking
    - Improve course content management
    - Add content version tracking
    - Add student progress tracking

  2. Security
    - Enable RLS on new tables
    - Add proper access policies
    - Secure video storage
*/

-- Create storage bucket for course videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course_videos', 'course_videos', false);

-- Create policy to allow video access
CREATE POLICY "Allow authenticated users to view course videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course_videos');

-- Create policy to allow instructors to manage videos
CREATE POLICY "Allow instructors to manage course videos"
ON storage.objects FOR ALL 
TO authenticated
USING (
  bucket_id = 'course_videos' 
  AND EXISTS (
    SELECT 1 FROM courses 
    WHERE instructor_id = auth.uid()
  )
);

-- Add video metadata tracking
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_metadata jsonb DEFAULT jsonb_build_object(
  'duration', 0,
  'resolution', '720p',
  'format', 'mp4',
  'storage_path', null
);

-- Add content version tracking
CREATE TABLE IF NOT EXISTS content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  is_current boolean DEFAULT false,
  version_number integer NOT NULL
);

-- Enable RLS on content versions
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for content versions
CREATE POLICY "Instructors can manage content versions"
  ON content_versions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = content_versions.lesson_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view current content versions"
  ON content_versions FOR SELECT
  TO authenticated
  USING (
    is_current = true
    AND EXISTS (
      SELECT 1 FROM progress p
      JOIN lessons l ON l.id = content_versions.lesson_id
      WHERE p.user_id = auth.uid()
      AND p.lesson_id = l.id
    )
  );

-- Add function to manage content versions
CREATE OR REPLACE FUNCTION manage_content_version()
RETURNS trigger AS $$
BEGIN
  -- If content changed, create new version
  IF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
    -- Get the latest version number
    WITH latest_version AS (
      SELECT COALESCE(MAX(version_number), 0) as ver
      FROM content_versions
      WHERE lesson_id = NEW.id
    )
    INSERT INTO content_versions (
      lesson_id,
      content,
      created_by,
      is_current,
      version_number
    )
    SELECT
      NEW.id,
      NEW.content,
      auth.uid(),
      true,
      ver + 1
    FROM latest_version;

    -- Set previous version as not current
    UPDATE content_versions
    SET is_current = false
    WHERE lesson_id = NEW.id
    AND id NOT IN (
      SELECT id FROM content_versions
      WHERE lesson_id = NEW.id
      ORDER BY version_number DESC
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for content versioning
DROP TRIGGER IF EXISTS lesson_content_version_trigger ON lessons;
CREATE TRIGGER lesson_content_version_trigger
  AFTER UPDATE ON lessons
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION manage_content_version();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_versions_lesson ON content_versions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_current ON content_versions(lesson_id) WHERE is_current = true;

-- Update progress tracking
ALTER TABLE progress 
ADD COLUMN IF NOT EXISTS last_content_version uuid REFERENCES content_versions(id),
ADD COLUMN IF NOT EXISTS content_progress jsonb DEFAULT '{}'::jsonb;

-- Add function to update student progress
CREATE OR REPLACE FUNCTION update_student_progress()
RETURNS trigger AS $$
BEGIN
  -- Update progress when content is viewed
  IF NEW.last_content_version IS NOT NULL AND NEW.last_content_version != OLD.last_content_version THEN
    NEW.content_progress = jsonb_set(
      COALESCE(NEW.content_progress, '{}'::jsonb),
      array[NEW.last_content_version::text],
      jsonb_build_object(
        'viewed_at', now(),
        'completed', NEW.completed
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for progress tracking
DROP TRIGGER IF EXISTS progress_update_trigger ON progress;
CREATE TRIGGER progress_update_trigger
  BEFORE UPDATE ON progress
  FOR EACH ROW
  WHEN (NEW.last_content_version IS DISTINCT FROM OLD.last_content_version)
  EXECUTE FUNCTION update_student_progress();

-- Add function to check course completion
CREATE OR REPLACE FUNCTION check_course_completion(p_user_id uuid, p_course_id uuid)
RETURNS boolean AS $$
DECLARE
  v_total_lessons integer;
  v_completed_lessons integer;
BEGIN
  -- Get total number of lessons
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons
  WHERE course_id = p_course_id;

  -- Get number of completed lessons
  SELECT COUNT(*) INTO v_completed_lessons
  FROM progress
  WHERE user_id = p_user_id
  AND course_id = p_course_id
  AND completed = true;

  -- Return true if all lessons completed
  RETURN v_total_lessons = v_completed_lessons;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;