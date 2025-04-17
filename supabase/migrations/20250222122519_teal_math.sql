/*
  # Fix Admin User Creation

  1. Changes
    - Properly handles existing records
    - Creates new admin user with specified credentials
    - Ensures profile creation
*/

DO $$ 
DECLARE
  v_user_id uuid;
BEGIN
  -- First try to find existing user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'sagnik@grindx.com';

  -- Delete existing profile if any
  DELETE FROM profiles
  WHERE email = 'sagnik@grindx.com';

  IF v_user_id IS NULL THEN
    -- Create new user if doesn't exist
    v_user_id := gen_random_uuid();
    
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
  ELSE
    -- Update existing user
    UPDATE auth.users
    SET 
      encrypted_password = crypt('sagnik@2002', gen_salt('bf')),
      raw_user_meta_data = '{"role":"admin"}'::jsonb,
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Create new profile
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

END $$;