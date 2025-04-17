/*
  # Fix Duplicate Lessons

  1. Changes
    - Remove duplicate lessons with the same title in the same course
    - Add unique constraint to prevent future duplicates
    - Update progress records to point to the remaining lesson
    
  2. Security
    - Maintain existing RLS policies
    - Preserve user progress data
*/

-- Function to identify and fix duplicate lessons
DO $$ 
DECLARE
  duplicate_record RECORD;
  keep_id uuid;
  remove_ids uuid[];
BEGIN
  -- Find courses with duplicate lesson titles
  FOR duplicate_record IN (
    SELECT course_id, title, COUNT(*) as count, array_agg(id) as lesson_ids
    FROM lessons
    GROUP BY course_id, title
    HAVING COUNT(*) > 1
    ORDER BY course_id, title
  ) LOOP
    -- Keep the first lesson and remove others
    keep_id := duplicate_record.lesson_ids[1];
    remove_ids := duplicate_record.lesson_ids[2:];
    
    RAISE NOTICE 'Fixing duplicates for course % title "%": keeping %, removing %', 
      duplicate_record.course_id, 
      duplicate_record.title, 
      keep_id, 
      remove_ids;
    
    -- Update progress records to point to the lesson we're keeping
    UPDATE progress
    SET lesson_id = keep_id
    WHERE lesson_id = ANY(remove_ids);
    
    -- Update quiz_attempts to point to the lesson we're keeping
    UPDATE quiz_attempts
    SET lesson_id = keep_id
    WHERE lesson_id = ANY(remove_ids);
    
    -- Update code_executions to point to the lesson we're keeping
    UPDATE code_executions
    SET lesson_id = keep_id
    WHERE lesson_id = ANY(remove_ids);
    
    -- Delete the duplicate lessons
    DELETE FROM lessons
    WHERE id = ANY(remove_ids);
  END LOOP;
  
  -- Add a unique constraint to prevent future duplicates
  -- First check if any duplicates remain
  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT course_id, title, COUNT(*) 
      FROM lessons 
      GROUP BY course_id, title 
      HAVING COUNT(*) > 1
    ) as remaining_duplicates
  ) THEN
    -- Only add constraint if no duplicates remain
    BEGIN
      ALTER TABLE lessons ADD CONSTRAINT lessons_course_title_unique UNIQUE (course_id, title);
    EXCEPTION
      WHEN duplicate_table THEN
        RAISE NOTICE 'Constraint already exists';
    END;
  END IF;
END $$;