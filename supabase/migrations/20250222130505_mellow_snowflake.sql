-- Update progress table policies
DROP POLICY IF EXISTS "Users can view own progress" ON progress;
DROP POLICY IF EXISTS "Users can update own progress" ON progress;
DROP POLICY IF EXISTS "Users can create own progress" ON progress;

-- Create new policies
CREATE POLICY "Users can view own progress"
  ON progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add NOT NULL constraint to user_id
ALTER TABLE progress 
  ALTER COLUMN user_id SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS progress_user_lesson_idx 
  ON progress(user_id, lesson_id);

-- Add foreign key constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'progress_user_id_fkey'
  ) THEN
    ALTER TABLE progress
      ADD CONSTRAINT progress_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;