/*
  # Fix admin user creation with proper handling

  This migration ensures the admin user is properly created or updated
  while handling existing records correctly.
*/

DO $$ 
DECLARE
  v_user_id uuid := 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
BEGIN
  -- First try to find existing admin user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@admin.com';

  -- If admin user exists, update it
  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      encrypted_password = crypt('admin123', gen_salt('bf')),
      raw_user_meta_data = '{"role":"admin"}'::jsonb,
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      email_confirmed_at = now(),
      updated_at = now()
    WHERE id = v_user_id;
  ELSE
    -- If no admin user exists, create a new one
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
      'admin@admin.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin"}'::jsonb,
      now(),
      now()
    );
  END IF;

  -- Ensure admin profile exists
  INSERT INTO profiles (
    id,
    email,
    role,
    full_name
  ) VALUES (
    v_user_id,
    'admin@admin.com',
    'admin',
    'Admin User'
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
    WHERE u.email = 'admin@admin.com'
    AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Failed to setup admin user properly';
  END IF;
END $$;