/*
  # Add Quiz Attempts Table
  
  1. New Tables
    - `quiz_attempts` - Stores student quiz submissions and scores
  
  2. Changes
    - Add trigger to update progress when quiz is completed
    - Add indexes for performance optimization
    - Add constraints for data validation
  
  3. Security
    - Enable RLS on new table
    - Add policies for student access
*/

-- Create quiz_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  lesson_id uuid REFERENCES lessons(id),
  course_id uuid REFERENCES courses(id),
  answers jsonb NOT NULL,
  correct_answers integer NOT NULL,
  total_questions integer NOT NULL,
  score_percentage numeric(5,2) NOT NULL,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_percentage CHECK (score_percentage >= 0 AND score_percentage <= 100),
  CONSTRAINT valid_questions CHECK (total_questions > 0),
  CONSTRAINT valid_correct_answers CHECK (correct_answers >= 0 AND correct_answers <= total_questions)
);

-- Enable RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for quiz_attempts if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_attempts' 
    AND policyname = 'Users can view own quiz attempts'
  ) THEN
    CREATE POLICY "Users can view own quiz attempts"
      ON quiz_attempts FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quiz_attempts' 
    AND policyname = 'Users can create own quiz attempts'
  ) THEN
    CREATE POLICY "Users can create own quiz attempts"
      ON quiz_attempts FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for better performance if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'quiz_attempts' 
    AND indexname = 'idx_quiz_attempts_user_lesson'
  ) THEN
    CREATE INDEX idx_quiz_attempts_user_lesson 
      ON quiz_attempts(user_id, lesson_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'quiz_attempts' 
    AND indexname = 'idx_quiz_attempts_course'
  ) THEN
    CREATE INDEX idx_quiz_attempts_course 
      ON quiz_attempts(course_id);
  END IF;
END $$;

-- Function to handle quiz attempt creation
CREATE OR REPLACE FUNCTION handle_quiz_attempt()
RETURNS trigger AS $$
BEGIN
  -- Update progress table with latest quiz score
  UPDATE progress
  SET 
    quiz_score = NEW.score_percentage,
    quiz_completed_at = NEW.completed_at,
    completed = CASE 
      WHEN NEW.score_percentage >= 70 THEN true 
      ELSE false 
    END,
    completed_at = CASE 
      WHEN NEW.score_percentage >= 70 THEN NEW.completed_at 
      ELSE null 
    END,
    updated_at = now()
  WHERE user_id = NEW.user_id 
  AND lesson_id = NEW.lesson_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS quiz_attempt_trigger ON quiz_attempts;

-- Create trigger for quiz attempt handling
CREATE TRIGGER quiz_attempt_trigger
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION handle_quiz_attempt();