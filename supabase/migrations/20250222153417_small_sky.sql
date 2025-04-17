-- Add user_id column to lessons table for progress tracking
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id);

-- Update progress tracking function
CREATE OR REPLACE FUNCTION check_lesson_progress(p_lesson_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the lesson is the first in the course (always accessible)
  IF EXISTS (
    SELECT 1 FROM lessons
    WHERE id = p_lesson_id
    AND order_position = 1
  ) THEN
    RETURN true;
  END IF;

  -- Check if previous lesson is completed
  RETURN EXISTS (
    SELECT 1
    FROM lessons l1
    JOIN lessons l2 ON l1.course_id = l2.course_id
    JOIN progress p ON p.lesson_id = l1.id AND p.user_id = p_user_id
    WHERE l2.id = p_lesson_id
    AND l1.order_position = l2.order_position - 1
    AND p.completed = true
  );
END;
$$;

-- Update lesson view query
CREATE OR REPLACE VIEW lesson_with_progress AS
SELECT 
  l.*,
  p.completed,
  p.last_watched_position,
  p.completed_at
FROM lessons l
LEFT JOIN progress p ON p.lesson_id = l.id;

-- Update progress policies
DROP POLICY IF EXISTS "Users can view own progress" ON progress;
DROP POLICY IF EXISTS "Users can update own progress" ON progress;
DROP POLICY IF EXISTS "Users can create own progress" ON progress;

CREATE POLICY "Users can view own progress"
  ON progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_order ON lessons(course_id, order_position);