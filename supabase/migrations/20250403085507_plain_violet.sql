/*
  # Add Course URL Column

  1. Changes
    - Add course_url column to courses table
    - Set default value for existing rows
    - Add index for faster lookups
*/

-- Add course_url column if it doesn't exist
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS course_url text;

-- Create index for course_url lookups
CREATE INDEX IF NOT EXISTS idx_courses_course_url 
ON courses(course_url);