import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth';
import { convertGoogleDriveLink, isSupabaseStorageUrl } from '../lib/videoUtils';
import type { Lesson, Progress, Quiz as QuizType } from '../types';
import { VideoPlayer } from '../components/VideoPlayer'; 
import { CodeEditor } from '../components/CodeEditor';
import { Quiz } from '../components/Quiz';
import { Button } from '../components/ui/Button'; 
import { CheckCircle, Lock } from 'lucide-react';

export function LessonView() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [quiz, setQuiz] = useState<QuizType | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUnlockingNext, setIsUnlockingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLessonData() {
      if (!lessonId || !courseId || !user) return;

      try {
        // Fetch lesson and progress in parallel
        const [lessonResult, progressResult] = await Promise.all([
          supabase
            .from('lessons')
            .select('*')
            .eq('id', lessonId)
            .single(),
          supabase
            .from('progress')
            .select('*')
            .eq('lesson_id', lessonId)
            .eq('user_id', user.id)
            .limit(1)
        ]);

        if (!lessonResult.data) {
          setLoading(false);
          return;
        }

        setLesson(lessonResult.data);
        setProgress(progressResult.data?.[0] || null);

        // Fetch quiz and next lesson in parallel
        const [quizResult, nextLessonResult] = await Promise.all([
          supabase
            .from('quizzes')
            .select('*')
            .eq('lesson_id', lessonId)
            .limit(1),
          supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .gt('order_position', lessonResult.data.order_position)
            .order('order_position', { ascending: true })
            .limit(1)
        ]);

        if (quizResult.data?.[0]) {
          setQuiz(quizResult.data[0]);
        }
        if (nextLessonResult.data?.[0]) {
          // Check if current lesson is completed before setting next lesson
          if (progressResult.data?.completed) {
            setNextLesson(nextLessonResult.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching lesson data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load lesson data');
      }
      setLoading(false);
    }

    fetchLessonData();
  }, [lessonId, courseId, user]);

  const handleProgress = async (progress: number) => {
    if (!lessonId || !courseId) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error: progressError } = await supabase.from('progress').upsert({
      user_id: user.user.id,
      lesson_id: lessonId,
      course_id: courseId,
      last_watched_position: Math.floor(progress * 100),
      completed: false
    });

    if (progressError) {
      console.error('Error saving progress:', progressError);
    }
  };

  const handleComplete = async () => {
    if (!lessonId || !courseId) return;
    
    setIsCompleting(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Mark lesson as complete
      const { error: progressError } = await supabase.from('progress').upsert({
        user_id: user.id,
        lesson_id: lessonId,
        course_id: courseId,
        completed: true,
        completed_at: new Date().toISOString(),
      });

      if (progressError) {
        throw new Error('Failed to save progress');
      }

      // If there's a quiz, show it before proceeding
      if (quiz) {
        setShowQuiz(true);
        return;
      }

      // If there's a next lesson, unlock it
      if (nextLesson) {
        setIsUnlockingNext(true);
        // Navigate to next lesson
        navigate(`/courses/${courseId}/lessons/${nextLesson.id}`);
      } else {
        // If no next lesson, return to course
        navigate(`/courses/${courseId}`);
      }
    } catch (error) {
      console.error('Error completing lesson:', error);
      // Show error message to user
      setError(error instanceof Error ? error.message : 'Failed to complete lesson');
    } finally {
      setIsCompleting(false);
      setIsUnlockingNext(false);
    }
  };

  const handleNext = async () => {
    if (!nextLesson || !courseId) return;
    
    setIsUnlockingNext(true);
    try {
      // Unlock next lesson if not already unlocked
      if (nextLesson.is_locked) {
        const { error: unlockError } = await supabase.from('lessons')
          .update({ is_locked: false })
          .eq('id', nextLesson.id);

        if (unlockError) {
          throw new Error('Failed to unlock next lesson');
        }
      }

      // Navigate to next lesson
      navigate(`/courses/${courseId}/lessons/${nextLesson.id}`);
    } catch (error) {
      console.error('Error navigating to next lesson:', error);
      setError(error instanceof Error ? error.message : 'Failed to navigate to next lesson');
    } finally {
      setIsUnlockingNext(false);
    }
  };

  const handleQuizComplete = async (score: number) => {
    if (!lessonId || !courseId) return;

    if (!user) return;

    if (!user) return;

    const { error: progressError } = await supabase.from('progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      course_id: courseId,
      quiz_score: score,
      quiz_completed_at: new Date().toISOString(),
      completed: true,
      completed_at: new Date().toISOString(),
    });

    if (progressError) {
      console.error('Error saving quiz progress:', progressError);
      return;
    }

    // Navigate to next lesson or back to course
    navigate(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-200">Lesson not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text mb-6">{lesson.title}</h1>
      {lesson.content?.type === 'quiz' && (
        <Quiz
          questions={lesson.content?.questions}
          onComplete={handleQuizComplete}
          lessonId={lessonId}
          courseId={courseId}
          lessonId={lessonId}
          courseId={courseId}
        />
      )}
      {lesson.content?.type === 'code' && (
        <div className="space-y-6">
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-semibold gradient-text mb-4">Instructions</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 whitespace-pre-wrap">{lesson.content.instructions}</p>
            </div>
          </div>
          
          <CodeEditor
            defaultLanguage={lesson.content.language}
            defaultValue={lesson.content.starter_code}
            lessonId={lesson.id}
          />
          
          <div className="flex justify-end">
            <Button
              onClick={handleComplete}
              isLoading={isCompleting}
              disabled={isCompleting || progress?.completed}
              variant={progress?.completed ? 'outline' : 'primary'}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {progress?.completed ? 'Completed' : 'Complete Exercise'}
            </Button>
          </div>
        </div>
      )}
      {lesson.content?.type !== 'code' && (
        <>
          {!showQuiz && (
            <>
              <div className="glass-effect rounded-lg overflow-hidden mb-8">
                <VideoPlayer
                  videoUrl={lesson.video_url || ''}
                  onProgress={handleProgress}
                  onComplete={handleComplete}
                />
              </div>
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold gradient-text">Lesson Progress</h2>
                  {progress?.completed && (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {nextLesson && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Button
                        variant="outline"
                        onClick={handleNext}
                        disabled={nextLesson.is_locked || isUnlockingNext}
                        isLoading={isUnlockingNext}
                      >
                        {nextLesson.is_locked ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Locked
                          </>
                        ) : (
                          <>
                            Next Lesson
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <Button
                    onClick={handleComplete}
                    isLoading={isCompleting}
                    disabled={isCompleting || progress?.completed}
                    variant={progress?.completed ? 'outline' : 'primary'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {progress?.completed ? 'Completed' : 'Complete Lesson'}
                  </Button>
                </div>
              </div>
              <div className="glass-effect rounded-lg p-6">
                <h2 className="text-xl font-semibold gradient-text mb-4">Lesson Description</h2>
                <div className="prose prose-invert max-w-none">
                  <div 
                    className="text-gray-300" 
                    dangerouslySetInnerHTML={{ __html: lesson.description }} 
                  />
                </div>
              </div>
            </>
          )}
          {showQuiz && quiz && (
            <Quiz 
              questions={quiz.questions} 
              onComplete={handleQuizComplete}
              lessonId={lessonId}
              courseId={courseId}
            />
          )}
          {showQuiz && !quiz && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold gradient-text mb-4">
                Lesson Complete!
              </h2>
              <Button onClick={() => navigate(`/courses/${courseId}`)}>
                Return to Course
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}