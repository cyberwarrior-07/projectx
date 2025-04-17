/*
  # Add type column to lessons table

  1. Changes
    - Add 'type' column to lessons table to store lesson content type
    - Set default value to 'text' for backward compatibility
    - Add check constraint to ensure valid types
    - Update existing rows to have type based on content

  2. Security
    - No changes to RLS policies needed
*/

-- Add type column with default value
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text'
CHECK (type IN ('video', 'text', 'code', 'quiz'));

-- Update existing rows based on content->type
DO $$
BEGIN
  UPDATE lessons
  SET type = COALESCE(
    (content->>'type')::text,
    CASE 
      WHEN video_url IS NOT NULL THEN 'video'
      ELSE 'text'
    END
  );
END $$;