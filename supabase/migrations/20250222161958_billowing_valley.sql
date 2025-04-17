-- Create or update admin user with proper error handling
DO $$ 
DECLARE
  v_user_id uuid;
  v_existing_profile_id uuid;
BEGIN
  -- First check for any existing admin profiles
  SELECT id INTO v_existing_profile_id
  FROM profiles
  WHERE email = 'admin@admin.com';

  -- If profile exists, use that ID
  IF v_existing_profile_id IS NOT NULL THEN
    v_user_id := v_existing_profile_id;
  ELSE
    -- Generate new UUID if no profile exists
    v_user_id := gen_random_uuid();
  END IF;

  -- Upsert auth user
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
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    updated_at = now();

  -- Upsert profile
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

  -- Update policies to ensure proper role handling
  DROP POLICY IF EXISTS "Allow admin full access" ON profiles;
  CREATE POLICY "Allow admin full access"
    ON profiles FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
      )
    );
END $$;