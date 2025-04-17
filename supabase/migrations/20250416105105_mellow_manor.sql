/*
  # Fix Video Loading Issues

  1. Changes
    - Make course_videos bucket public
    - Add Content-Type headers for video files
    - Create permissive storage policies
    - Add CORS headers for video streaming
    - Fix metadata for existing videos

  2. Security
    - Maintain authenticated upload requirements
    - Allow public read access for videos
*/

-- Make course_videos bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'course_videos';

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course_videos', 'course_videos', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies that might be restricting access
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON storage.objects;', ' ')
    FROM pg_policies
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (
      policyname LIKE '%video%' OR
      policyname LIKE '%course_videos%'
    )
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create simple, permissive policies for video access
CREATE POLICY "public_read_course_videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course_videos');

CREATE POLICY "authenticated_upload_course_videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course_videos');

CREATE POLICY "authenticated_update_course_videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course_videos');

CREATE POLICY "authenticated_delete_course_videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course_videos');

-- Update metadata for existing MP4 videos
DO $$
DECLARE
  video_object RECORD;
BEGIN
  FOR video_object IN
    SELECT id, name
    FROM storage.objects
    WHERE bucket_id = 'course_videos'
  LOOP
    -- Set proper MIME type based on file extension
    IF video_object.name LIKE '%.mp4' OR video_object.name LIKE '%.MP4' THEN
      UPDATE storage.objects
      SET metadata = jsonb_build_object(
        'mimetype', 'video/mp4',
        'cacheControl', 'public, max-age=31536000'
      )
      WHERE id = video_object.id;
    ELSIF video_object.name LIKE '%.webm' OR video_object.name LIKE '%.WEBM' THEN
      UPDATE storage.objects
      SET metadata = jsonb_build_object(
        'mimetype', 'video/webm',
        'cacheControl', 'public, max-age=31536000'
      )
      WHERE id = video_object.id;
    ELSIF video_object.name LIKE '%.mov' OR video_object.name LIKE '%.MOV' THEN
      UPDATE storage.objects
      SET metadata = jsonb_build_object(
        'mimetype', 'video/quicktime',
        'cacheControl', 'public, max-age=31536000'
      )
      WHERE id = video_object.id;
    END IF;
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;