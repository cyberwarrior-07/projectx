/*
  # Fix Foreign Key Constraints

  1. Changes
    - Add ON DELETE CASCADE to foreign key constraints
    - Ensure proper deletion of related records
    - Maintain data integrity

  2. Security
    - Preserve existing RLS policies
    - Maintain access controls
*/

-- Drop existing foreign key constraints
ALTER TABLE progress 
  DROP CONSTRAINT IF EXISTS progress_lesson_id_fkey;

ALTER TABLE code_executions 
  DROP CONSTRAINT IF EXISTS code_executions_lesson_id_fkey;

ALTER TABLE content_versions 
  DROP CONSTRAINT IF EXISTS content_versions_lesson_id_fkey;

-- Recreate foreign key constraints with ON DELETE CASCADE
ALTER TABLE progress
  ADD CONSTRAINT progress_lesson_id_fkey 
  FOREIGN KEY (lesson_id) 
  REFERENCES lessons(id) 
  ON DELETE CASCADE;

ALTER TABLE code_executions
  ADD CONSTRAINT code_executions_lesson_id_fkey 
  FOREIGN KEY (lesson_id) 
  REFERENCES lessons(id) 
  ON DELETE CASCADE;

ALTER TABLE content_versions
  ADD CONSTRAINT content_versions_lesson_id_fkey 
  FOREIGN KEY (lesson_id) 
  REFERENCES lessons(id) 
  ON DELETE CASCADE;

-- Update the handleDeleteBlock function to handle deletion more efficiently
CREATE OR REPLACE FUNCTION handle_lesson_delete()
RETURNS trigger AS $$
BEGIN
  -- All related records will be automatically deleted due to ON DELETE CASCADE
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for lesson deletion
DROP TRIGGER IF EXISTS lesson_delete_trigger ON lessons;
CREATE TRIGGER lesson_delete_trigger
  AFTER DELETE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION handle_lesson_delete();