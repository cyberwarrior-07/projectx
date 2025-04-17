/*
  # Add Category Column to Courses Table

  1. Changes
    - Add category column to courses table
    - Set default value for existing rows
    - Add index for faster lookups
*/

-- Add category column if it doesn't exist
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Programming';

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_courses_category 
ON courses(category);

-- Update existing rows to have a category if null
UPDATE courses 
SET category = 'Programming' 
WHERE category IS NULL;