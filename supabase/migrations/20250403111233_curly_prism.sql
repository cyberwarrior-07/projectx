/*
  # Add Difficulty Column to Courses Table

  1. Changes
    - Add difficulty column to courses table
    - Set default value for existing rows
    - Add check constraint for valid values
*/

-- Add difficulty column if it doesn't exist
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'beginner';

-- Add check constraint to ensure valid difficulty values
ALTER TABLE courses
ADD CONSTRAINT courses_difficulty_check 
CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'));

-- Update existing rows to have a difficulty if null
UPDATE courses 
SET difficulty = 'beginner' 
WHERE difficulty IS NULL;