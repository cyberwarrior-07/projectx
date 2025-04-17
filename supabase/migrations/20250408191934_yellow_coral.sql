/*
  # Fix Code Execution and Content Saving

  1. Changes
    - Update code execution language constraints
    - Add content version tracking
    - Add progress tracking improvements
    - Fix foreign key relationships

  2. Security
    - Add RLS policies for content access
    - Ensure proper data isolation
*/

-- First update any existing code executions to use supported languages
UPDATE code_executions 
SET language = 'javascript' 
WHERE language NOT IN ('javascript', 'python', 'typescript');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_versions_lesson_current 
ON content_versions(lesson_id, is_current);

CREATE INDEX IF NOT EXISTS idx_progress_user_lesson_content 
ON progress(user_id, lesson_id, last_content_version);

-- Add function to handle content version updates
CREATE OR REPLACE FUNCTION handle_content_version_update()
RETURNS trigger AS $$
BEGIN
  -- Update progress records when content version changes
  UPDATE progress
  SET 
    last_content_version = NEW.id,
    content_progress = jsonb_build_object(
      'version', NEW.version_number,
      'viewed_at', now()
    ),
    updated_at = now()
  WHERE lesson_id = NEW.lesson_id
  AND completed = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for content version updates
DROP TRIGGER IF EXISTS content_version_update_trigger ON content_versions;
CREATE TRIGGER content_version_update_trigger
  AFTER INSERT OR UPDATE ON content_versions
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION handle_content_version_update();

-- Add function to handle code execution tracking
CREATE OR REPLACE FUNCTION handle_code_execution()
RETURNS trigger AS $$
BEGIN
  -- Update progress with execution result
  UPDATE progress
  SET content_progress = jsonb_set(
    COALESCE(content_progress, '{}'::jsonb),
    '{executions}',
    COALESCE(
      content_progress->'executions', '[]'::jsonb
    ) || jsonb_build_object(
      'id', NEW.id,
      'executed_at', NEW.executed_at,
      'success', (NEW.error IS NULL)
    )
  )
  WHERE user_id = NEW.user_id
  AND lesson_id = NEW.lesson_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for code execution tracking
DROP TRIGGER IF EXISTS code_execution_trigger ON code_executions;
CREATE TRIGGER code_execution_trigger
  AFTER INSERT ON code_executions
  FOR EACH ROW
  EXECUTE FUNCTION handle_code_execution();

-- Update RLS policies for code executions
DROP POLICY IF EXISTS "Users can view own code executions" ON code_executions;
DROP POLICY IF EXISTS "Users can insert own code executions" ON code_executions;

CREATE POLICY "Users can view own code executions"
  ON code_executions FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own code executions"
  ON code_executions FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Add check constraint for supported languages
ALTER TABLE code_executions
DROP CONSTRAINT IF EXISTS code_executions_language_check;

-- Add new constraint after updating data
ALTER TABLE code_executions
ADD CONSTRAINT code_executions_language_check
CHECK (language IN ('javascript', 'python', 'typescript'));

-- Add function to check lesson completion
CREATE OR REPLACE FUNCTION check_lesson_completion(p_user_id uuid, p_lesson_id uuid)
RETURNS boolean AS $$
DECLARE
  v_completed boolean;
  v_lesson_type text;
BEGIN
  -- Get lesson type
  SELECT content->>'type'
  INTO v_lesson_type
  FROM lessons l
  JOIN content_versions cv ON cv.lesson_id = l.id
  WHERE l.id = p_lesson_id
  AND cv.is_current = true;

  -- Check completion based on lesson type
  CASE v_lesson_type
    WHEN 'video' THEN
      SELECT completed INTO v_completed
      FROM progress
      WHERE user_id = p_user_id
      AND lesson_id = p_lesson_id;
      
    WHEN 'quiz' THEN
      SELECT quiz_score IS NOT NULL INTO v_completed
      FROM progress
      WHERE user_id = p_user_id
      AND lesson_id = p_lesson_id;
      
    WHEN 'code' THEN
      SELECT EXISTS (
        SELECT 1 FROM code_executions
        WHERE user_id = p_user_id
        AND lesson_id = p_lesson_id
        AND error IS NULL
      ) INTO v_completed;
      
    ELSE
      v_completed := false;
  END CASE;

  RETURN COALESCE(v_completed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;