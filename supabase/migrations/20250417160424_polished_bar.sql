/*
  # Fix Sequential Lesson Locking

  1. Changes
    - Add function to properly handle sequential lesson unlocking
    - Update progress trigger to ensure lessons unlock in order
    - Fix existing lesson lock states based on completion status

  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity
*/

-- Create function to handle sequential lesson unlocking
CREATE OR REPLACE FUNCTION update_lesson_lock_status()
RETURNS trigger AS $$
DECLARE
  v_course_id uuid;
  v_completed_lesson_id uuid;
  v_next_lesson_id uuid;
  v_order_position integer;
BEGIN
  -- Get course_id and order_position of the completed lesson
  SELECT course_id, order_position INTO v_course_id, v_order_position
  FROM lessons
  WHERE id = NEW.lesson_id;
  
  -- Only proceed if the lesson was just completed
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
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
  v_lesson RECORD;
  v_last_completed_position INTEGER;
BEGIN
  -- Process each course
  FOR v_course IN (SELECT DISTINCT course_id FROM lessons) LOOP
    -- Reset the last completed position for this course
    v_last_completed_position := 0;
    
    -- Find the highest order_position of a completed lesson
    SELECT MAX(l.order_position) INTO v_last_completed_position
    FROM lessons l
    JOIN progress p ON p.lesson_id = l.id
    WHERE l.course_id = v_course.course_id
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
  v_is_first boolean;
BEGIN
  -- Get lesson details
  SELECT course_id, order_position INTO v_course_id, v_order_position
  FROM lessons
  WHERE id = p_lesson_id;
  
  -- First lesson is always unlocked
  IF v_order_position = 1 THEN
    RETURN true;
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