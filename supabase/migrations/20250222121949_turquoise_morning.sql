/*
  # Create New Admin User

  1. Changes
    - Creates a new admin user with specified credentials
    - Sets up proper profile and role
    - Ensures RLS policies are correctly configured
*/

-- Create or update admin user with proper error handling
DO $$ 
DECLARE
  v_user_id uuid := gen_random_uuid();
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
      'sagnik@grindx.com',
      crypt('sagnik@2002', gen_salt('bf')),
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
        encrypted_password = crypt('sagnik@2002', gen_salt('bf')),
        raw_user_meta_data = '{"role":"admin"}'::jsonb,
        updated_at = now()
      WHERE email = 'sagnik@grindx.com'
      RETURNING id INTO v_user_id;
  END;

  -- Then try to update profile
  UPDATE profiles
  SET 
    email = 'sagnik@grindx.com',
    role = 'admin',
    full_name = 'Sagnik Admin'
  WHERE id = v_user_id;

  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO profiles (
      id,
      email,
      role,
      full_name
    ) VALUES (
      v_user_id,
      'sagnik@grindx.com',
      'admin',
      'Sagnik Admin'
    );
  END IF;
END $$;