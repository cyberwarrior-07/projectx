/*
  # Add Assignments and Grades Tables

  1. New Tables
    - `assignments`: For course assignments and deadlines
    - `grades`: For tracking student performance

  2. Security
    - Enable RLS on both tables
    - Add policies for student and instructor access
*/

DO $$ BEGIN
  -- Create assignments table if it doesn't exist
  CREATE TABLE IF NOT EXISTS assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
    due_date timestamptz NOT NULL,
    priority text CHECK (priority IN ('high', 'medium', 'low')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  -- Create grades table if it doesn't exist
  CREATE TABLE IF NOT EXISTS grades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id),
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
    assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
    score integer NOT NULL CHECK (score >= 0),
    max_score integer NOT NULL CHECK (max_score > 0),
    submitted_at timestamptz DEFAULT now(),
    graded_at timestamptz DEFAULT now(),
    CONSTRAINT valid_score CHECK (score <= max_score)
  );

  -- Enable RLS
  ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

  -- Assignments policies
  CREATE POLICY "assignments_view_enrolled_students"
    ON assignments FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM progress
        WHERE progress.course_id = assignments.course_id
        AND progress.user_id = auth.uid()
      )
    );

  CREATE POLICY "assignments_manage_instructors"
    ON assignments FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = assignments.course_id
        AND courses.instructor_id = auth.uid()
      )
    );

  -- Grades policies
  CREATE POLICY "grades_view_own"
    ON grades FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "grades_manage_instructors"
    ON grades FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = grades.course_id
        AND courses.instructor_id = auth.uid()
      )
    );
END $$;