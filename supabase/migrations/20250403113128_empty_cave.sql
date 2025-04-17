/*
  # Add Price Column to Courses Table

  1. Changes
    - Add price column to courses table
    - Set default value for existing rows
    - Add numeric type with proper precision
*/

-- Add price column if it doesn't exist
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0;

-- Update existing rows to have price set to 0 if null
UPDATE courses 
SET price = 0 
WHERE price IS NULL;