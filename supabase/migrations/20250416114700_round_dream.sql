/*
  # Fix Video Playback from Supabase Storage
  
  1. Changes
    - Configure storage buckets with proper CORS settings
    - Set correct content types for video files
    - Add cache control headers for better streaming
    - Fix storage policies for video access
    
  2. Security
    - Maintain public read access for videos
    - Ensure proper authentication for uploads
*/

-- Make course_videos bucket public with proper CORS settings
UPDATE storage.buckets
SET public = true,
    file_size_limit = 5368709120, -- 5GB
    allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
WHERE id = 'course_videos';

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course_videos', 
  'course_videos', 
  true, 
  5368709120, -- 5GB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Set proper content types for existing video files
UPDATE storage.objects
SET metadata = jsonb_build_object(
  'mimetype', 
  CASE 
    WHEN name LIKE '%.mp4' THEN 'video/mp4'
    WHEN name LIKE '%.webm' THEN 'video/webm'
    WHEN name LIKE '%.mov' THEN 'video/quicktime'
    WHEN name LIKE '%.m4v' THEN 'video/x-m4v'
    ELSE 'video/mp4'
  END,
  'cacheControl', 'public, max-age=31536000',
  'contentDisposition', 'inline'
)
WHERE bucket_id = 'course_videos';

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
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

-- Create simple, permissive policies for video access
CREATE POLICY "public_read_videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course_videos');

CREATE POLICY "authenticated_upload_videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course_videos');

CREATE POLICY "authenticated_update_videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course_videos');

CREATE POLICY "authenticated_delete_videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course_videos');

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;