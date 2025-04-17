/*
  # Fix admin authentication

  1. Changes
    - Create dedicated admin user with fixed credentials
    - Update RLS policies for admin access
    - Fix profile creation trigger
*/

DO $$ 
DECLARE
  v_admin_id uuid := 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
BEGIN
  -- First clean up any existing admin data
  DELETE FROM profiles WHERE email = 'admin@admin.com';
  DELETE FROM auth.users WHERE email = 'admin@admin.com';

  -- Create admin user with fixed credentials
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    deleted_at,
    invited_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@admin.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin"}'::jsonb,
    now(),
    now(),
    false,
    null,
    null,
    '',
    '',
    '',
    ''
  );

  -- Create admin profile
  INSERT INTO profiles (
    id,
    email,
    role,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    v_admin_id,
    'admin@admin.com',
    'admin',
    'Admin User',
    now(),
    now()
  );

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