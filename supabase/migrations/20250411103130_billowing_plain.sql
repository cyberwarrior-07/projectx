/*
  # Add Video Metadata Support

  1. Changes
    - Add video_metadata column to lessons table
    - Create video storage bucket
    - Add policies for video access
    - Add trigger for video deletion cleanup

  2. Security
    - Enable RLS on storage bucket
    - Add proper access policies
    - Ensure secure video handling
*/

-- Create storage bucket for course videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course_videos', 'course_videos', false)
ON CONFLICT (id) DO NOTHING;

-- Add video metadata column to lessons
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS video_metadata jsonb 
DEFAULT jsonb_build_object(
  'duration', 0,
  'resolution', '720p',
  'format', 'mp4',
  'storage_path', null
);

-- Add policy for video access
CREATE POLICY "Allow video access to enrolled students"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'course_videos'
  AND EXISTS (
    SELECT 1 FROM lessons l
    JOIN progress p ON p.lesson_id = l.id
    WHERE p.user_id = auth.uid()
    AND storage.foldername(name) = l.course_id::text
  )
);

-- Add policy for instructor video management
CREATE POLICY "Allow instructors to manage course videos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'course_videos'
  AND EXISTS (
    SELECT 1 FROM courses c
    WHERE c.instructor_id = auth.uid()
    AND storage.foldername(name) = c.id::text
  )
);

-- Create function to handle video deletion
CREATE OR REPLACE FUNCTION handle_lesson_delete()
RETURNS trigger AS $$
BEGIN
  -- Delete video file if it exists
  IF OLD.video_metadata->>'storage_path' IS NOT NULL THEN
    PERFORM storage.delete(
      'course_videos',
      OLD.video_metadata->>'storage_path'
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for video cleanup
DROP TRIGGER IF EXISTS lesson_delete_trigger ON lessons;
CREATE TRIGGER lesson_delete_trigger
  AFTER DELETE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION handle_lesson_delete();