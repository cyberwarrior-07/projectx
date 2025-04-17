/*
  # Add Storage Bucket RLS Policies

  1. Changes
    - Create storage buckets if they don't exist
    - Add RLS policies for each bucket:
      - Allow admins and instructors to manage files
      - Allow public read access for course materials
      
  2. Security
    - Enable RLS on all buckets
    - Add policies for:
      - File management (upload/delete) for admins/instructors
      - Public read access where appropriate
*/

-- Create buckets if they don't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES 
    ('course_images', 'course_images', true),
    ('course_videos', 'course_videos', true),
    ('course_files', 'course_files', true),
    ('course_thumbnails', 'course_thumbnails', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS on buckets
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for admins and instructors to manage files
CREATE POLICY "Allow admins and instructors to manage files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'instructor')
  )
);

-- Policy for public read access to course materials
CREATE POLICY "Allow public read access to course materials"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id IN ('course_images', 'course_videos', 'course_files', 'course_thumbnails')
);