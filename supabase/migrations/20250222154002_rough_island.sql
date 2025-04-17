/*
  # Fix Admin User Creation

  1. Changes
    - Properly handles admin user creation/update
    - Uses id-based conflict resolution
    - Ensures proper role assignment
    
  2. Security
    - Maintains data integrity
    - Preserves existing user data
*/

DO $$ 
DECLARE
  v_user_id uuid;
BEGIN
  -- First try to find existing user by email
  SELECT id INTO v_user_id
  FROM auth.users
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

  -- Ensure profile exists
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
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

  -- Verify setup
  IF NOT EXISTS (
    SELECT 1 
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE u.email = 'sagnik@grindx.com'
    AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Failed to setup admin user properly';
  END IF;
END $$;