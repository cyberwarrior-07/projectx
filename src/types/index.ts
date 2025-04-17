export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'student' | 'instructor' | 'admin';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  thumbnail_url: string;
  lessons: { id: string }[];
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_url: string;
  order: number;
  is_locked: boolean;
  duration: number;
}

export interface Progress {
  user_id: string;
  lesson_id: string;
  course_id: string;
  completed: boolean;
  last_watched_position: number;
  completed_at?: string;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
}

export interface CodeExecution {
  id: string;
  language: string;
  code: string;
  output: string;
  error?: string;
  executed_at: string;
  user_id?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}