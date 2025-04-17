/*
  # Seed Python Course Data

  1. Course Content
    - Create Python Fundamentals course
    - Add course lessons
    - Add quizzes for lessons
    - Add assignments

  2. Data Structure
    - Course details with description and thumbnail
    - Sequential lessons with video content
    - Interactive quizzes
    - Course assignments with due dates
*/

DO $$ 
DECLARE
  v_course_id uuid;
  v_lesson_id uuid;
BEGIN
  -- Insert the Python Fundamentals course
  INSERT INTO courses (id, title, description, thumbnail_url)
  VALUES (
    gen_random_uuid(),
    'Python Fundamentals',
    'A comprehensive 8-week course designed to teach you the fundamentals of Python programming. Perfect for beginners, this course covers everything from basic syntax to practical applications.',
    'https://images.unsplash.com/photo-1526379095098-d400fd0bf935'
  )
  RETURNING id INTO v_course_id;

  -- Create lessons for the course
  -- Module 1: Introduction to Python
  INSERT INTO lessons (course_id, title, description, video_url, order_position, is_locked, duration)
  VALUES
  (v_course_id, 'Getting Started with Python', 'Learn about Python''s history, installation, and your first program', 'https://example.com/videos/python-intro', 1, false, 30)
  RETURNING id INTO v_lesson_id;

  -- Add quiz for first lesson
  INSERT INTO quizzes (lesson_id, title, questions)
  VALUES (v_lesson_id, 'Python Basics Quiz', '[
    {
      "id": "q1",
      "question": "What is Python primarily used for?",
      "options": [
        "Web development only",
        "Data analysis, AI, web development, and more",
        "Mobile app development only",
        "Game development only"
      ],
      "correct_answer": 1
    },
    {
      "id": "q2",
      "question": "Which symbol is used for comments in Python?",
      "options": [
        "//",
        "/* */",
        "#",
        "<!-- -->"
      ],
      "correct_answer": 2
    }
  ]');

  -- Add remaining lessons
  INSERT INTO lessons (course_id, title, description, video_url, order_position, is_locked, duration)
  VALUES
  (v_course_id, 'Variables and Data Types', 'Understanding Python''s basic data types and variable declaration', 'https://example.com/videos/python-variables', 2, true, 45),
  (v_course_id, 'Basic Operators', 'Learn about arithmetic, comparison, and logical operators', 'https://example.com/videos/python-operators', 3, true, 40),
  (v_course_id, 'Conditional Statements', 'Master if, elif, and else statements', 'https://example.com/videos/python-conditionals', 4, true, 50),
  (v_course_id, 'Loops in Python', 'Working with for and while loops', 'https://example.com/videos/python-loops', 5, true, 45),
  (v_course_id, 'Functions Basics', 'Creating and using functions', 'https://example.com/videos/python-functions', 6, true, 55),
  (v_course_id, 'Working with Modules', 'Understanding Python modules and imports', 'https://example.com/videos/python-modules', 7, true, 40);

  -- Create assignments
  INSERT INTO assignments (course_id, title, description, due_date, priority)
  VALUES
  (v_course_id, 'Python Calculator', 'Build a simple calculator using Python functions', '2025-04-15', 'high'),
  (v_course_id, 'Number Guessing Game', 'Create a number guessing game using loops and conditionals', '2025-04-22', 'medium'),
  (v_course_id, 'File Processor', 'Build a program that can read and write files', '2025-04-29', 'medium');

END $$;