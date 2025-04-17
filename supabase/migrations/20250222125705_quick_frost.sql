/*
  # Add Code Exercise Support
  
  1. Schema Updates
    - Add content column to lessons table for storing exercise data
    - Create code_executions table for tracking student submissions
  
  2. Course Creation
    - Python Labs course with interactive exercises
    - Progressive lessons with embedded code challenges
*/

DO $$ 
DECLARE
  v_course_id uuid;
  v_lesson_id uuid;
BEGIN
  -- First add content column if it doesn't exist
  ALTER TABLE lessons 
  ADD COLUMN IF NOT EXISTS content jsonb;

  -- Create Python Labs course
  INSERT INTO courses (
    title,
    description,
    thumbnail_url,
    available_languages
  ) VALUES (
    'Python Labs: Interactive Coding Practice',
    'Master Python programming through hands-on coding exercises. Practice real-world problems and get instant feedback on your solutions.',
    'https://images.unsplash.com/photo-1526379095098-d400fd0bf935',
    ARRAY['English']
  )
  RETURNING id INTO v_course_id;

  -- Create lessons with coding exercises
  INSERT INTO lessons (
    course_id,
    title,
    description,
    order_position,
    is_locked,
    duration,
    content
  ) VALUES
  (
    v_course_id,
    'Variables and Basic Operations',
    'Practice working with Python variables and basic arithmetic operations',
    1,
    false,
    30,
    jsonb_build_object(
      'type', 'code',
      'language', 'python',
      'instructions', 'Create variables and perform basic arithmetic operations',
      'starter_code', '# Create two variables x and y\nx = 10\ny = 5\n\n# Calculate and print their sum\nprint(x + y)',
      'solution', '# Example solution\nx = 10\ny = 5\nprint(x + y)\n# Output: 15'
    )
  ),
  (
    v_course_id,
    'Control Flow Practice',
    'Write if statements and loops to solve programming challenges',
    2,
    true,
    45,
    jsonb_build_object(
      'type', 'code',
      'language', 'python',
      'instructions', 'Write a program that checks if a number is positive, negative, or zero',
      'starter_code', '# Write your code here\nnum = int(input())\n\n# Add your conditions',
      'solution', 'num = int(input())\nif num > 0:\n    print("Positive")\nelif num < 0:\n    print("Negative")\nelse:\n    print("Zero")'
    )
  ),
  (
    v_course_id,
    'Function Challenges',
    'Practice writing and using functions in Python',
    3,
    true,
    40,
    jsonb_build_object(
      'type', 'code',
      'language', 'python',
      'instructions', 'Create a function that calculates the factorial of a number',
      'starter_code', 'def factorial(n):\n    # Your code here\n    pass\n\n# Test your function\nprint(factorial(5))',
      'solution', 'def factorial(n):\n    if n == 0 or n == 1:\n        return 1\n    return n * factorial(n-1)\n\nprint(factorial(5))'
    )
  );

  -- Create code execution tracking table if not exists
  CREATE TABLE IF NOT EXISTS code_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id),
    lesson_id uuid REFERENCES lessons(id),
    code text NOT NULL,
    output text,
    error text,
    executed_at timestamptz DEFAULT now()
  );

  -- Enable RLS on code_executions
  ALTER TABLE code_executions ENABLE ROW LEVEL SECURITY;

  -- Create policies for code_executions
  CREATE POLICY "Users can view own code executions"
    ON code_executions FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own code executions"
    ON code_executions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Admins can view all code executions"
    ON code_executions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    );

END $$;