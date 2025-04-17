/*
  # Add Language Column to Code Executions Table

  1. Changes
    - Add language column to code_executions table
    - Set default value for existing rows
    - Add check constraint for valid languages
*/

-- Add language column to code_executions table
ALTER TABLE code_executions 
ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'javascript';

-- Add check constraint to ensure valid language values
ALTER TABLE code_executions
ADD CONSTRAINT code_executions_language_check 
CHECK (language IN ('javascript', 'python', 'typescript'));

-- Update existing rows to have language set to javascript if null
UPDATE code_executions 
SET language = 'javascript' 
WHERE language IS NULL;