/*
  # Add video URL to courses table

  1. Changes
    - Add `video_url` column to courses table for storing course intro videos
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE courses ADD COLUMN video_url text;
  END IF;
END $$;