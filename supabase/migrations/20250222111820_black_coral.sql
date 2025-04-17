/*
  # Create Test Users and Profiles

  This migration creates test users for both admin and student roles.

  1. Test Users
    - Admin user: admin@example.com / admin123
    - Student user: student@example.com / student123

  2. Security
    - Creates users in auth.users table
    - Creates corresponding profiles with appropriate roles
*/

-- Create admin test user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create student test user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  'b54f6f5d-27d5-4953-8d88-602c44d7e7e2'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'student@example.com',
  crypt('student123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create admin profile
INSERT INTO profiles (
  id,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  'ad4f6f5d-27d5-4953-8d88-602c44d7e7e1'::uuid,
  'Admin User',
  'admin',
  now(),
  now()
);

-- Create student profile
INSERT INTO profiles (
  id,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  'b54f6f5d-27d5-4953-8d88-602c44d7e7e2'::uuid,
  'Student User',
  'student',
  now(),
  now()
);