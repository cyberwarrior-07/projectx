-- Add quiz_score column to progress table
ALTER TABLE progress 
ADD COLUMN IF NOT EXISTS quiz_score integer,
ADD COLUMN IF NOT EXISTS quiz_completed_at timestamptz;

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