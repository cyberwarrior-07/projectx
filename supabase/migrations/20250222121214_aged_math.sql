/*
  # Create Admin User Migration
  
  1. Changes
    - Creates admin user in auth.users if not exists
    - Creates admin profile in profiles if not exists
    - Uses UPSERT to avoid conflicts
    - Sets proper role and metadata
*/

-- Create or update admin user with proper error handling
DO $$ 
DECLARE
  v_user_id uuid := 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
BEGIN
  -- First try to create auth user
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin"}'::jsonb,
      now(),
      now()
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Update existing user
      UPDATE auth.users
      SET 
        email = 'admin@example.com',
        encrypted_password = crypt('admin123', gen_salt('bf')),
        raw_user_meta_data = '{"role":"admin"}'::jsonb,
        updated_at = now()
      WHERE id = v_user_id;
  END;

  -- Then try to create profile
  BEGIN
    INSERT INTO profiles (
      id,
      email,
      role,
      full_name
    ) VALUES (
      v_user_id,
      'admin@example.com',
      'admin',
      'Admin User'
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Update existing profile
      UPDATE profiles
      SET 
        email = 'admin@example.com',
        role = 'admin',
        full_name = 'Admin User'
      WHERE id = v_user_id;
  END;
END $$;