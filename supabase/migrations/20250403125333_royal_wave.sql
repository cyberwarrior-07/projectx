/*
  # Fix Progress Table Constraint Handling

  1. Changes
    - Add ON CONFLICT handling to progress table
    - Update existing records instead of failing on duplicates
    - Maintain data integrity with proper constraints

  2. Security
    - Preserve existing RLS policies
    - Maintain data access controls
*/

-- First ensure the unique constraint exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'progress_user_id_lesson_id_key'
  ) THEN
    ALTER TABLE progress
      ADD CONSTRAINT progress_user_id_lesson_id_key 
      UNIQUE (user_id, lesson_id);
  END IF;
END $$;

-- Create index for faster lookups if not exists
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson 
ON progress(user_id, lesson_id);

-- Update RLS policies to handle conflicts properly
DROP POLICY IF EXISTS "Users can create own progress" ON progress;
CREATE POLICY "Users can create own progress"
  ON progress FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Add function to handle progress updates
CREATE OR REPLACE FUNCTION handle_progress_update()
RETURNS trigger AS $$
BEGIN
  -- If record exists, update it
  IF EXISTS (
    SELECT 1 FROM progress 
    WHERE user_id = NEW.user_id 
    AND lesson_id = NEW.lesson_id
  ) THEN
    UPDATE progress SET
      completed = COALESCE(NEW.completed, progress.completed),
      last_watched_position = COALESCE(NEW.last_watched_position, progress.last_watched_position),
      completed_at = COALESCE(NEW.completed_at, progress.completed_at),
      quiz_score = COALESCE(NEW.quiz_score, progress.quiz_score),
      quiz_completed_at = COALESCE(NEW.quiz_completed_at, progress.quiz_completed_at),
      content_progress = COALESCE(NEW.content_progress, progress.content_progress),
      updated_at = now()
    WHERE user_id = NEW.user_id 
    AND lesson_id = NEW.lesson_id;
    RETURN NULL;
  END IF;
  -- Otherwise insert new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for progress updates
DROP TRIGGER IF EXISTS progress_update_trigger ON progress;
CREATE TRIGGER progress_update_trigger
  BEFORE INSERT ON progress
  FOR EACH ROW
  EXECUTE FUNCTION handle_progress_update();