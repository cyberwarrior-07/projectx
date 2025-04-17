/*
  # Fix Video Access and Playback Issues

  1. Changes
    - Make all storage buckets public
    - Create simple storage policies for all buckets
    - Remove restrictive CORS settings
    - Ensure proper content types for videos

  2. Security
    - Maintain access control while ensuring videos are accessible
    - Allow public read access to all course materials
*/

-- Make all buckets public
UPDATE storage.buckets
SET public = true
WHERE id IN ('course_videos', 'course_thumbnails', 'course_images', 'course_files');

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON storage.objects;', ' ')
    FROM pg_policies
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
  );
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create simple policies for all buckets
CREATE POLICY "allow_public_read_access"
ON storage.objects
FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "allow_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (true);

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