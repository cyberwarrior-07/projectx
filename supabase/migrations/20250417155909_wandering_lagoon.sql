/*
  # Fix Duplicate Lessons

  1. Changes
    - Remove duplicate lessons with the same title in the same course
    - Add unique constraint to prevent future duplicates
    - Handle progress records properly to avoid constraint violations
    
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
  progress_record RECORD;
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
    
    -- For each progress record pointing to a lesson we're going to delete,
    -- we need to handle it carefully to avoid constraint violations
    FOR progress_record IN (
      SELECT id, user_id, lesson_id
      FROM progress
      WHERE lesson_id = ANY(remove_ids)
    ) LOOP
      -- Check if there's already a progress record for this user and the lesson we're keeping
      IF EXISTS (
        SELECT 1 FROM progress 
        WHERE user_id = progress_record.user_id 
        AND lesson_id = keep_id
      ) THEN
        -- If a record already exists, delete the duplicate progress record
        DELETE FROM progress
        WHERE id = progress_record.id;
      ELSE
        -- If no record exists, update the progress record to point to the lesson we're keeping
        UPDATE progress
        SET lesson_id = keep_id
        WHERE id = progress_record.id;
      END IF;
    END LOOP;
    
    -- Update quiz_attempts to point to the lesson we're keeping
    -- First delete any that would cause conflicts
    DELETE FROM quiz_attempts
    WHERE lesson_id = ANY(remove_ids)
    AND user_id IN (
      SELECT user_id FROM quiz_attempts
      WHERE lesson_id = keep_id
    );
    
    -- Then update the remaining ones
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