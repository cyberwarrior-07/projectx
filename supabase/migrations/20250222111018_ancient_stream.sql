/*
  # Initial Schema Setup

  1. New Tables
    - profiles (user profiles with roles)
    - courses (course information)
    - lessons (course lessons)
    - progress (user progress tracking)
    - quizzes (lesson quizzes)

  2. Security
    - Enable RLS on all tables
    - Add policies for each table
    - Create lesson access check function
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  avatar_url text,
  role user_role DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  instructor_id uuid REFERENCES profiles(id),
  thumbnail_url text,
  available_languages text[] DEFAULT ARRAY['English'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text,
  order_position integer NOT NULL,
  is_locked boolean DEFAULT true,
  available_languages text[] DEFAULT ARRAY['English'],
  duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  lesson_id uuid REFERENCES lessons(id),
  course_id uuid REFERENCES courses(id),
  completed boolean DEFAULT false,
  last_watched_position integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  questions jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Courses policies
CREATE POLICY "Courses are viewable by everyone"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Instructors can create courses"
  ON courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
    )
  );

CREATE POLICY "Instructors can update own courses"
  ON courses FOR UPDATE
  USING (instructor_id = auth.uid());

-- Lessons policies
CREATE POLICY "Lessons are viewable by everyone"
  ON lessons FOR SELECT
  USING (true);

CREATE POLICY "Instructors can manage course lessons"
  ON lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Progress policies
CREATE POLICY "Users can view own progress"
  ON progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify own progress"
  ON progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Quizzes policies
CREATE POLICY "Quizzes are viewable by everyone"
  ON quizzes FOR SELECT
  USING (true);

CREATE POLICY "Instructors can manage quizzes"
  ON quizzes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses
      JOIN lessons ON lessons.course_id = courses.id
      WHERE lessons.id = quizzes.lesson_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Create functions
CREATE OR REPLACE FUNCTION check_lesson_access(p_lesson_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the lesson is the first in the course (always accessible)
  IF EXISTS (
    SELECT 1 FROM lessons
    WHERE id = p_lesson_id
    AND order_position = 1
  ) THEN
    RETURN true;
  END IF;

  -- Check if previous lesson is completed
  RETURN EXISTS (
    SELECT 1
    FROM lessons l1
    JOIN lessons l2 ON l1.course_id = l2.course_id
    LEFT JOIN progress p ON p.lesson_id = l1.id AND p.user_id = p_user_id
    WHERE l2.id = p_lesson_id
    AND l1.order_position = l2.order_position - 1
    AND p.completed = true
  );
END;
$$;