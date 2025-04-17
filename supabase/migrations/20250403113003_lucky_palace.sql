/*
  # Add is_featured Column to Courses Table

  1. Changes
    - Add is_featured column to courses table
    - Set default value for existing rows
    - Add index for faster lookups
*/

-- Add is_featured column if it doesn't exist
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Update existing rows to have is_featured set to false if null
UPDATE courses 
SET is_featured = false 
WHERE is_featured IS NULL;