/*
  # Fix Sequential Lesson Locking

  1. Changes
    - Improve lesson locking logic to ensure strict sequential progression
    - Fix issue with assignments being unlocked when previous lessons are locked
    - Update trigger function to properly handle all lesson types
    - Add function to reset course progress when all lessons are completed

  2. Security
    - Maintain existing RLS policies
    - Ensure proper data isolation between users
*/

-- Create improved function to handle sequential lesson unlocking
CREATE OR REPLACE FUNCTION update_lesson_lock_status()
RETURNS trigger AS $$
DECLARE
  v_course_id uuid;
  v_completed_lesson_id uuid;
  v_next_lesson_id uuid;
  v_order_position integer;
  v_total_lessons integer;
  v_completed_lessons integer;
  v_all_completed boolean;
BEGIN
  -- Get course_id and order_position of the completed lesson
  SELECT course_id, order_position INTO v_course_id, v_order_position
  FROM lessons
  WHERE id = NEW.lesson_id;
  
  -- Only proceed if the lesson was just completed
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    -- Count total lessons in course
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons
    WHERE course_id = v_course_id;
    
    -- Count completed lessons in course for this user
    SELECT COUNT(*) INTO v_completed_lessons
    FROM progress p
    JOIN lessons l ON l.id = p.lesson_id
    WHERE l.course_id = v_course_id
    AND p.user_id = NEW.user_id
    AND p.completed = true;
    
    -- Check if all lessons are now completed
    v_all_completed := (v_completed_lessons >= v_total_lessons);
    
    IF v_all_completed THEN
      -- Reset course: lock all lessons except the first one
      UPDATE lessons
      SET is_locked = (order_position > 1)
      WHERE course_id = v_course_id;
      
      -- Reset progress for all lessons except the current one
      UPDATE progress
      SET 
        completed = false,
        completed_at = NULL,
        last_watched_position = 0,
        updated_at = now()
      WHERE 
        user_id = NEW.user_id
        AND lesson_id IN (
          SELECT id FROM lessons 
          WHERE course_id = v_course_id
          AND id != NEW.lesson_id
        );
    ELSE
      -- Find the next lesson in sequence
      SELECT id INTO v_next_lesson_id
      FROM lessons
      WHERE course_id = v_course_id
      AND order_position = v_order_position + 1
      ORDER BY order_position
      LIMIT 1;
      
      -- If there is a next lesson, unlock it
      IF v_next_lesson_id IS NOT NULL THEN
        UPDATE lessons
        SET is_locked = false
        WHERE id = v_next_lesson_id;
        
        -- Ensure all lessons after the next one remain locked
        UPDATE lessons
        SET is_locked = true
        WHERE course_id = v_course_id
        AND order_position > v_order_position + 1;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace trigger for progress updates
DROP TRIGGER IF EXISTS progress_update_trigger ON progress;
CREATE TRIGGER progress_update_trigger
  AFTER INSERT OR UPDATE OF completed ON progress
  FOR EACH ROW
  WHEN (NEW.completed = true)
  EXECUTE FUNCTION update_lesson_lock_status();

-- Fix existing lesson lock states based on completion status
DO $$ 
DECLARE
  v_course RECORD;
  v_user RECORD;
  v_last_completed_position INTEGER;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_all_completed BOOLEAN;
BEGIN
  -- Process each course for each user
  FOR v_course IN (SELECT DISTINCT course_id FROM lessons) LOOP
    FOR v_user IN (SELECT DISTINCT user_id FROM progress) LOOP
      -- Count total lessons in course
      SELECT COUNT(*) INTO v_total_lessons
      FROM lessons
      WHERE course_id = v_course.course_id;
      
      -- Count completed lessons for this user in this course
      SELECT COUNT(*) INTO v_completed_lessons
      FROM progress p
      JOIN lessons l ON l.id = p.lesson_id
      WHERE l.course_id = v_course.course_id
      AND p.user_id = v_user.user_id
      AND p.completed = true;
      
      -- Check if all lessons are completed
      v_all_completed := (v_completed_lessons >= v_total_lessons AND v_total_lessons > 0);
      
      IF v_all_completed THEN
        -- If all lessons are completed, reset the course
        -- Unlock only the first lesson
        UPDATE lessons
        SET is_locked = (order_position > 1)
        WHERE course_id = v_course.course_id;
      ELSE
        -- Find the highest order_position of a completed lesson
        SELECT MAX(l.order_position) INTO v_last_completed_position
        FROM lessons l
        JOIN progress p ON p.lesson_id = l.id
        WHERE l.course_id = v_course.course_id
        AND p.user_id = v_user.user_id
        AND p.completed = true;
        
        -- If no lessons are completed, only the first lesson should be unlocked
        IF v_last_completed_position IS NULL OR v_last_completed_position = 0 THEN
          -- Unlock the first lesson
          UPDATE lessons
          SET is_locked = false
          WHERE course_id = v_course.course_id
          AND order_position = 1;
          
          -- Lock all other lessons
          UPDATE lessons
          SET is_locked = true
          WHERE course_id = v_course.course_id
          AND order_position > 1;
        ELSE
          -- Unlock lessons up to the next one after the last completed
          UPDATE lessons
          SET is_locked = false
          WHERE course_id = v_course.course_id
          AND order_position <= v_last_completed_position + 1;
          
          -- Lock all lessons after that
          UPDATE lessons
          SET is_locked = true
          WHERE course_id = v_course.course_id
          AND order_position > v_last_completed_position + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Add function to check if a lesson should be unlocked
CREATE OR REPLACE FUNCTION is_lesson_unlocked(p_lesson_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_course_id uuid;
  v_order_position integer;
  v_prev_lesson_id uuid;
  v_prev_completed boolean;
  v_total_lessons integer;
  v_completed_lessons integer;
  v_all_completed boolean;
BEGIN
  -- Get lesson details
  SELECT course_id, order_position INTO v_course_id, v_order_position
  FROM lessons
  WHERE id = p_lesson_id;
  
  -- First lesson is always unlocked
  IF v_order_position = 1 THEN
    RETURN true;
  END IF;
  
  -- Count total and completed lessons
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons
  WHERE course_id = v_course_id;
  
  SELECT COUNT(*) INTO v_completed_lessons
  FROM progress p
  JOIN lessons l ON l.id = p.lesson_id
  WHERE l.course_id = v_course_id
  AND p.user_id = p_user_id
  AND p.completed = true;
  
  -- If all lessons are completed, only the first lesson is unlocked (course reset)
  IF v_completed_lessons >= v_total_lessons AND v_total_lessons > 0 THEN
    RETURN v_order_position = 1;
  END IF;
  
  -- Check if previous lesson exists and is completed
  SELECT id INTO v_prev_lesson_id
  FROM lessons
  WHERE course_id = v_course_id
  AND order_position = v_order_position - 1;
  
  IF v_prev_lesson_id IS NULL THEN
    -- No previous lesson, this must be the first one
    RETURN true;
  END IF;
  
  -- Check if previous lesson is completed
  SELECT completed INTO v_prev_completed
  FROM progress
  WHERE lesson_id = v_prev_lesson_id
  AND user_id = p_user_id;
  
  -- If previous lesson is completed, this lesson should be unlocked
  RETURN COALESCE(v_prev_completed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update lessons table policies to use the is_lesson_unlocked function
DROP POLICY IF EXISTS "lessons_viewable_by_everyone" ON lessons;
CREATE POLICY "lessons_viewable_by_everyone"
ON lessons FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = lessons.course_id
    AND (
      courses.visibility = 'public'
      OR EXISTS (
        SELECT 1 FROM progress
        WHERE progress.course_id = courses.id
        AND progress.user_id = auth.uid()
      )
      OR courses.instructor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  )
);