/*
  # Clean Admin User Setup

  1. Changes
    - Consolidates all admin user creation logic into a single migration
    - Uses proper error handling and idempotent operations
    - Ensures both auth.users and profiles tables are properly synchronized
    - Removes duplicate admin creation migrations

  2. Security
    - Maintains existing RLS policies
    - Ensures admin role is properly set
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
    INSERT INTO auth.users (
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'sagnik@grindx.com',
      crypt('sagnik@2002', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin"}'::jsonb,
      now(),
      now()
    )
    RETURNING id INTO v_user_id;
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

  -- Verify the admin user was created/updated successfully
  IF NOT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = v_user_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Failed to create/update admin user';
  END IF;

END $$;