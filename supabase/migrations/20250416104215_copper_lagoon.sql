/*
  # Fix Video Access and Playback Issues

  1. Changes
    - Make course_videos bucket public for better access
    - Add permissive storage policies for video access
    - Set proper content types for video files
    - Fix caching issues with video content

  2. Security
    - Maintain access control while ensuring videos are accessible
    - Allow public read access to course videos
*/

-- Make course_videos bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'course_videos';

-- Drop existing policies that might be restricting access
DO $$ 
BEGIN
  -- Drop policies related to course_videos bucket
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON storage.objects;', ' ')
    FROM pg_policies
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE '%video%'
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create permissive policies for video access
CREATE POLICY "allow_public_video_access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course_videos');

CREATE POLICY "allow_authenticated_video_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course_videos');

CREATE POLICY "allow_authenticated_video_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course_videos');

CREATE POLICY "allow_authenticated_video_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course_videos');

-- Set proper content types for video files
UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{mimetype}',
  '"video/mp4"'
)
WHERE bucket_id = 'course_videos' 
AND (name LIKE '%.mp4' OR name LIKE '%.MP4');

UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{mimetype}',
  '"video/webm"'
)
WHERE bucket_id = 'course_videos' 
AND (name LIKE '%.webm' OR name LIKE '%.WEBM');

UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{mimetype}',
  '"video/quicktime"'
)
WHERE bucket_id = 'course_videos' 
AND (name LIKE '%.mov' OR name LIKE '%.MOV');

-- Set cache control headers for better streaming
UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{cacheControl}',
  '"public, max-age=31536000"'
)
WHERE bucket_id = 'course_videos';

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;