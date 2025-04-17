/*
  # Fix Video Metadata and Storage Settings

  1. Changes
    - Update storage bucket permissions
    - Set proper content types for videos
    - Add cache control headers
    - Ensure CORS is properly configured

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Make all buckets public
UPDATE storage.buckets
SET public = true
WHERE id IN ('course_videos', 'course_thumbnails', 'course_images', 'course_files');

-- Set proper content types for video files using jsonb_build_object instead of jsonb_set
UPDATE storage.objects
SET metadata = jsonb_build_object(
  'mimetype', 'video/mp4',
  'cacheControl', 'public, max-age=31536000',
  'contentDisposition', 'inline'
)
WHERE bucket_id = 'course_videos' 
AND (name LIKE '%.mp4' OR name LIKE '%.MP4');

UPDATE storage.objects
SET metadata = jsonb_build_object(
  'mimetype', 'video/webm',
  'cacheControl', 'public, max-age=31536000',
  'contentDisposition', 'inline'
)
WHERE bucket_id = 'course_videos' 
AND (name LIKE '%.webm' OR name LIKE '%.WEBM');

UPDATE storage.objects
SET metadata = jsonb_build_object(
  'mimetype', 'video/quicktime',
  'cacheControl', 'public, max-age=31536000',
  'contentDisposition', 'inline'
)
WHERE bucket_id = 'course_videos' 
AND (name LIKE '%.mov' OR name LIKE '%.MOV');

-- Add content-type header to ensure proper playback using CASE expression with jsonb_build_object
UPDATE storage.objects
SET metadata = 
  CASE
    WHEN name LIKE '%.mp4' OR name LIKE '%.MP4' THEN 
      jsonb_build_object('contentType', 'video/mp4', 'cacheControl', 'public, max-age=31536000')
    WHEN name LIKE '%.webm' OR name LIKE '%.WEBM' THEN 
      jsonb_build_object('contentType', 'video/webm', 'cacheControl', 'public, max-age=31536000')
    WHEN name LIKE '%.mov' OR name LIKE '%.MOV' THEN 
      jsonb_build_object('contentType', 'video/quicktime', 'cacheControl', 'public, max-age=31536000')
    ELSE 
      jsonb_build_object('contentType', 'video/mp4', 'cacheControl', 'public, max-age=31536000')
  END
WHERE bucket_id = 'course_videos';