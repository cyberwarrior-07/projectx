DO $$ 
DECLARE
  v_admin_id uuid := 'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1';
BEGIN
  -- Update admin user with proper email provider metadata
  UPDATE auth.users
  SET 
    raw_app_meta_data = jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']
    ),
    updated_at = now()
  WHERE email = 'admin@admin.com';

  -- Verify the update
  IF NOT EXISTS (
    SELECT 1 
    FROM auth.users
    WHERE email = 'admin@admin.com'
    AND raw_app_meta_data->>'provider' = 'email'
    AND raw_app_meta_data->'providers' ? 'email'
  ) THEN
    RAISE EXCEPTION 'Failed to update admin user email provider';
  END IF;
END $$;