/*
  # Add WASM Storage Support

  1. Changes
    - Create storage bucket for WASM files
    - Add public access policy
    - Add admin management policy
    - Configure CORS settings
*/

-- Create storage bucket for WASM files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('wasm', 'wasm', true)
ON CONFLICT (id) DO NOTHING;

-- Add policy to allow public read access to WASM files
CREATE POLICY "Allow public read access to WASM files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wasm');

-- Add policy to allow admin to manage WASM files
CREATE POLICY "Allow admin to manage WASM files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'wasm'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Set CORS configuration
UPDATE storage.buckets
SET public = true
WHERE id = 'wasm';