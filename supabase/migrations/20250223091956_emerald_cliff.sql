DO $$ 
DECLARE
  v_user_id uuid := 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
  v_email text := 'admin@admin.com';
  v_password text := 'admin123';
  v_existing_id uuid;
BEGIN
  -- First find any existing admin user
  SELECT id INTO v_existing_id
  FROM auth.users
  WHERE email = v_email;

  -- If there's an existing admin user with a different ID, migrate the profile
  IF v_existing_id IS NOT NULL AND v_existing_id != v_user_id THEN
    -- Update the profile to use our desired ID
    UPDATE profiles 
    SET id = v_user_id 
    WHERE id = v_existing_id;

    -- Now we can safely delete the old auth user
    DELETE FROM auth.users 
    WHERE id = v_existing_id;
  END IF;

  -- Create or update the admin user with all required fields
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
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(v_password, gen_salt('bf')),
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
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    updated_at = now();

  -- Create or update the admin profile
  INSERT INTO profiles (
    id,
    email,
    role,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_email,
    'admin',
    'Admin User',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  -- Clean up any remaining duplicate profiles
  DELETE FROM profiles 
  WHERE email = v_email 
  AND id != v_user_id;

  -- Verify the setup
  IF NOT EXISTS (
    SELECT 1 
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE u.email = v_email
    AND p.role = 'admin'
    AND u.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Failed to setup admin user properly';
  END IF;
END $$;