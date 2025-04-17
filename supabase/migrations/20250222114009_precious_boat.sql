/*
  # Fix grades table structure

  1. Changes
    - Add course_title and quiz_title columns
    - Add completed_at column
    - Update constraints and indexes
*/

-- Drop existing grades table if it exists
DROP TABLE IF EXISTS grades;

-- Create new grades table with correct structure
CREATE TABLE grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  course_id uuid REFERENCES courses(id),
  course_title text NOT NULL,
  quiz_title text NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  max_score integer NOT NULL CHECK (max_score > 0),
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_score CHECK (score <= max_score)
);

-- Enable RLS
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own grades"
  ON grades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Instructors can manage grades"
  ON grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  );

-- Create indexes
CREATE INDEX grades_user_id_idx ON grades(user_id);
CREATE INDEX grades_course_id_idx ON grades(course_id);
CREATE INDEX grades_completed_at_idx ON grades(completed_at);