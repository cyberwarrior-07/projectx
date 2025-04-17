/*
  # Add C/C++ Language Support to Code Executions

  1. Changes
    - Drop existing language constraint if exists
    - Add new constraint with updated language options
    - Ensure language column exists with proper default
*/

-- First drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'code_executions_language_check'
  ) THEN
    ALTER TABLE code_executions 
    DROP CONSTRAINT code_executions_language_check;
  END IF;
END $$;

-- Add language column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'code_executions' 
    AND column_name = 'language'
  ) THEN
    ALTER TABLE code_executions 
    ADD COLUMN language text NOT NULL DEFAULT 'javascript';
  END IF;
END $$;

-- Add new constraint with updated language options
ALTER TABLE code_executions
ADD CONSTRAINT code_executions_language_check 
CHECK (language IN ('javascript', 'python', 'typescript', 'c', 'cpp'));

-- Update existing rows to have language set to javascript if null
UPDATE code_executions 
SET language = 'javascript' 
WHERE language IS NULL;