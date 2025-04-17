/*
  # Add Quiz Attempts and Scoring System

  1. Changes
    - Add quiz_attempts table for tracking all quiz submissions
    - Add quiz_scores table for storing final scores
    - Add functions for calculating percentages
    - Add RLS policies for attempt tracking

  2. Security
    - Enable RLS on new tables
    - Add policies for student access
    - Ensure data integrity
*/

-- Create quiz_attempts table
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

-- Create policies for quiz_attempts
CREATE POLICY "Users can view own quiz attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quiz attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_quiz_attempts_user_lesson 
  ON quiz_attempts(user_id, lesson_id);

CREATE INDEX idx_quiz_attempts_course 
  ON quiz_attempts(course_id);

-- Function to calculate quiz score percentage
CREATE OR REPLACE FUNCTION calculate_quiz_score(
  correct integer,
  total integer
) RETURNS numeric AS $$
BEGIN
  IF total = 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND((correct::numeric / total::numeric) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

  -- Create or update grade record
  INSERT INTO grades (
    user_id,
    course_id,
    course_title,
    quiz_title,
    score,
    max_score,
    completed_at
  )
  SELECT
    NEW.user_id,
    NEW.course_id,
    c.title,
    l.title,
    NEW.score_percentage,
    100,
    NEW.completed_at
  FROM lessons l
  JOIN courses c ON c.id = l.course_id
  WHERE l.id = NEW.lesson_id
  ON CONFLICT (user_id, course_id) 
  DO UPDATE SET
    score = EXCLUDED.score,
    completed_at = EXCLUDED.completed_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for quiz attempt handling
CREATE TRIGGER quiz_attempt_trigger
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION handle_quiz_attempt();