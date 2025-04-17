import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth';
import type { Course, Lesson, Assignment, QuizQuestion } from '../types';
import { Lock, Play, CheckCircle, Clock, Calendar, Code, FileQuestion, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { convertGoogleDriveLink } from '../lib/videoUtils';
import { Button } from '../components/ui/Button';
import { VideoPlayer } from '../components/VideoPlayer';
import { CodeEditor } from '../components/CodeEditor';
import { Quiz } from '../components/Quiz';

export function CourseView() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [completedLessonsCount, setCompletedLessonsCount] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUnlockingNext, setIsUnlockingNext] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [allLessonsCompleted, setAllLessonsCompleted] = useState(false);

  // Subscribe to realtime changes
  useEffect(() => {
    async function fetchCourseData() {
      if (!courseId || !user) return;

      try {
        // Fetch initial data
        const [{ data: course, error: courseError }, { data: lessonsData, error: lessonsError }, { data: progressData, error: progressError }, { data: assignmentsData, error: assignmentsError }] = await Promise.all([
          supabase.from('courses').select('*').eq('id', courseId).single(),
          supabase.from('lessons') 
            .select(`
              *,
              content_versions (
                content,
                version_number
              )
            `)
            .eq('course_id', courseId)
            .order('order_position')
            .order('id'),
          supabase.from('progress')
            .select('lesson_id, completed, last_watched_position')
            .eq('course_id', courseId)
            .eq('user_id', user.id),
          supabase.from('assignments')
            .select('*')
            .eq('course_id', courseId)
            .order('due_date'),
        ]);

        if (courseError) throw courseError;
        if (lessonsError) throw lessonsError;
        if (progressError) throw progressError;
        if (assignmentsError) throw assignmentsError;

        if (course) {
          setCourse(course);
        }

        if (lessonsData) {
          // Remove duplicate lessons with the same title
          const uniqueLessons = lessonsData.reduce((acc, lesson) => {
            // If we already have a lesson with this title, skip it
            if (!acc.some(l => l.title === lesson.title)) {
              acc.push(lesson);
            }
            return acc;
          }, [] as typeof lessonsData);
          
          const progressMap = (progressData || []).reduce((acc, curr) => {
            acc[curr.lesson_id] = curr.completed;
            return acc;
          }, {} as Record<string, boolean>);
          
          // Create a set of completed lesson IDs for easier lookup
          const completedLessonsSet = new Set<string>();
          progressData?.forEach(item => {
            if (item.completed) {
              completedLessonsSet.add(item.lesson_id);
            }
          });
          
          setCompletedLessonsCount(completedLessonsSet.size);
          setProgress(progressMap); 
          setCompletedLessons(completedLessonsSet);
          
          // Check if all lessons are completed
          const allCompleted = completedLessonsSet.size === uniqueLessons.length && uniqueLessons.length > 0;
          setAllLessonsCompleted(allCompleted);
          
          // Apply strict sequential unlocking logic
          const updatedLessons = uniqueLessons.map((lesson, index) => {
            // First lesson is always unlocked
            if (index === 0) return { ...lesson, is_locked: false, order_position: index + 1 };
            
            // Check if the previous lesson is completed
            const prevLesson = uniqueLessons[index - 1];
            const isPrevCompleted = completedLessonsSet.has(prevLesson.id);
            
            // If this lesson is already completed, don't lock it
            const isThisLessonCompleted = completedLessonsSet.has(lesson.id);
            
            // If all lessons are completed, lock all except the first
            if (allCompleted && index > 0 && !isThisLessonCompleted) {
              return { ...lesson, is_locked: true, order_position: index + 1 };
            }
            
            return {
              ...lesson,
              is_locked: !(isPrevCompleted || isThisLessonCompleted),
              order_position: index + 1
            };
          });
          
          setLessons(updatedLessons);
          
          // Find the last incomplete lesson or first lesson
          const lastIncompleteLesson = updatedLessons.find(lesson => !progressMap[lesson.id]);
          const lessonToLoad = lastIncompleteLesson || updatedLessons[0];
          
          if (lessonToLoad) {
            const currentIndex = updatedLessons.findIndex(l => l.id === lessonToLoad.id);
            setPrevLesson(currentIndex > 0 ? updatedLessons[currentIndex - 1] : null);
            setNextLesson(currentIndex < updatedLessons.length - 1 ? updatedLessons[currentIndex + 1] : null);
            setCurrentLesson(lessonToLoad);
          }
        }

        if (assignmentsData) {
          setAssignments(assignmentsData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching course data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load course data');
        setLoading(false);
      }
    }

    fetchCourseData();
  }, [courseId, user]);

  const handleLessonClick = async (lesson: Lesson) => {
    if (lesson.is_locked) {
      return;
    }

    const currentIndex = lessons.findIndex(l => l.id === lesson.id);
    setPrevLesson(currentIndex > 0 ? lessons[currentIndex - 1] : null);
    setNextLesson(currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null);

    if (user) {
      try {
        // Use upsert instead of insert to handle existing records
        const { error } = await supabase
          .from('progress')
          .upsert({
            user_id: user.id,
            lesson_id: lesson.id,
            course_id: courseId,
            last_watched_position: 0,
            updated_at: new Date().toISOString(),
            completed: false,
            completed_at: null,
            quiz_score: null,
            quiz_completed_at: null,
            content_progress: '{}'
          }, {
            onConflict: 'user_id,lesson_id'
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error updating progress:', error);
        setError(error instanceof Error ? error.message : 'Failed to update progress');
      }
    }

    // Set current lesson after progress is updated
    setCurrentLesson(lesson);
  };

  const handleVideoProgress = async (progress: number) => {
    if (!user || !currentLesson) return;

    try {
      const { error } = await supabase
        .from('progress')
        .update({
          last_watched_position: Math.floor(progress * 100),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('lesson_id', currentLesson.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating video progress:', error);
      setError(error instanceof Error ? error.message : 'Failed to update video progress');
    }
  };

  const handleVideoComplete = async () => {
    if (!user || !currentLesson) return;

    try {
      const { error } = await supabase
        .from('progress')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('lesson_id', currentLesson.id);

      if (error) throw error;

      // Update local progress state
      setProgress(prev => ({
        ...prev,
        [currentLesson.id]: true
      }));
      
      // Add to completed lessons set and increment count
      setCompletedLessons(prev => {
        const newSet = new Set(prev);
        newSet.add(currentLesson.id);
        return newSet;
      });
      setCompletedLessonsCount(prev => prev + 1);
      
      // Check if all lessons are now completed
      const allCompleted = completedLessonsCount + 1 >= lessons.length;
      setAllLessonsCompleted(allCompleted);

      // Update lessons to unlock next lesson
      setLessons(prevLessons => {
        return prevLessons.map((lesson, index) => {
          // First lesson is always unlocked
          if (index === 0) return { ...lesson, is_locked: false };
          
          // If this lesson is already completed, keep it unlocked
          if (completedLessons.has(lesson.id)) return { ...lesson, is_locked: false };
          
          // For subsequent lessons, check if ALL previous lessons are completed or being completed
          let allPreviousCompleted = true;
          for (let i = 0; i < index; i++) {
            const isPrevCompleted = completedLessons.has(prevLessons[i].id) || 
                                   prevLessons[i].id === currentLesson.id;
            if (!isPrevCompleted) {
              allPreviousCompleted = false;
              break;
            }
          }
          
          return {
            ...lesson,
            is_locked: !allPreviousCompleted
          };
        });
      });
    } catch (error) {
      console.error('Error marking lesson as complete:', error);
    }
  };

  const handleComplete = async () => {
    if (!currentLesson || !courseId || !user) return;
    
    setIsCompleting(true);
    setError(null);

    try {
      // Use upsert to handle existing progress records
      const { error: progressError } = await supabase
        .from('progress')
        .upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          course_id: courseId,
          completed: true,
          completed_at: new Date().toISOString(),
          last_watched_position: 100,
          updated_at: new Date().toISOString(),
          content_progress: '{}'
        }, {
          onConflict: 'user_id,lesson_id'
        });

      if (progressError) throw progressError;

      setProgress(prev => ({
        ...prev,
        [currentLesson.id]: true
      }));
      
      // Add to completed lessons set and increment count
      setCompletedLessons(prev => {
        const newSet = new Set(prev);
        newSet.add(currentLesson.id);
        return newSet;
      });
      setCompletedLessonsCount(prev => prev + 1);
      
      // Check if all lessons are now completed
      const allCompleted = completedLessonsCount + 1 >= lessons.length;
      setAllLessonsCompleted(allCompleted);

      // Update lessons to unlock next lesson
      setLessons(prevLessons => {
        if (allLessonsCompleted) {
          // If all lessons are completed, reset the course
          return prevLessons.map((lesson, index) => ({
            ...lesson,
            is_locked: index !== 0 // Lock all except the first lesson
          }));
        } else {
          // Otherwise, unlock the next lesson
          return prevLessons.map((lesson, index) => {
            // First lesson is always unlocked
            if (index === 0) return { ...lesson, is_locked: false };
            
            // If this lesson is already completed, keep it unlocked
            if (completedLessons.has(lesson.id) || lesson.id === currentLesson.id) {
              return { ...lesson, is_locked: false };
            }
            
            // Unlock the next lesson after the current one
            const currentIndex = prevLessons.findIndex(l => l.id === currentLesson.id);
            if (index === currentIndex + 1) {
              return { ...lesson, is_locked: false };
            }
            
            // Keep all other lessons locked
            return { ...lesson, is_locked: true };
          });
        }
      });

      // If there's a quiz, show it before proceeding
      if (currentLesson.content_versions?.[0]?.content?.type === 'quiz') {
        setQuiz(currentLesson.content_versions[0].content.questions);
        setShowQuiz(true);
        return;
      }

      // If there's a next lesson, navigate to it
      if (nextLesson) {
        setIsUnlockingNext(true);
        // Update next lesson's lock status
        const updatedNextLesson = {
          ...nextLesson,
          is_locked: false
        };
        setNextLesson(updatedNextLesson);
        await handleLessonClick(updatedNextLesson);
        setShowQuiz(false);
      } else {
        // If no next lesson, return to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error completing lesson:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete lesson');
    } finally {
      setIsCompleting(false);
      setIsUnlockingNext(false);
    }
  };

  const handleQuizComplete = async (score: number) => {
    if (!currentLesson || !courseId || !user) return;

    setIsCompleting(true);
    try {
      // Use upsert to handle existing progress records
      const { error: progressError } = await supabase
        .from('progress')
        .upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          course_id: courseId,
          quiz_score: score,
          quiz_completed_at: new Date().toISOString(),
          completed: true,
          completed_at: new Date().toISOString(),
          content_progress: '{}'
        }, {
          onConflict: 'user_id,lesson_id'
        });

      if (progressError) throw progressError;

      // Update progress state
      setProgress(prev => ({
        ...prev,
        [currentLesson.id]: true
      }));

      // Update lessons to unlock next lesson
      setLessons(prevLessons => {
        if (allLessonsCompleted) {
          // If all lessons are completed, reset the course
          return prevLessons.map((lesson, index) => ({
            ...lesson,
            is_locked: index !== 0 // Lock all except the first lesson
          }));
        } else {
          // Otherwise, unlock the next lesson
          return prevLessons.map((lesson, index) => {
            // First lesson is always unlocked
            if (index === 0) return { ...lesson, is_locked: false };
            
            // If this lesson is already completed, keep it unlocked
            if (completedLessons.has(lesson.id) || lesson.id === currentLesson.id) {
              return { ...lesson, is_locked: false };
            }
            
            // Unlock the next lesson after the current one
            const currentIndex = prevLessons.findIndex(l => l.id === currentLesson.id);
            if (index === currentIndex + 1) {
              return { ...lesson, is_locked: false };
            }
            
            // Keep all other lessons locked
            return { ...lesson, is_locked: true };
          });
        }
      });

      // Hide quiz and proceed to next lesson
      setShowQuiz(false);
      if (nextLesson) {
        const updatedNextLesson = {
          ...nextLesson,
          is_locked: false
        };
        setNextLesson(updatedNextLesson);
        await handleLessonClick(updatedNextLesson);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving quiz score:', error);
      setError(error instanceof Error ? error.message : 'Failed to save quiz score');
    } finally {
      setIsCompleting(false);
    
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-200">Course not found</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-red-400">{error}</h2>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-4">{course.title}</h1>
        <div className="text-gray-400" dangerouslySetInnerHTML={{ __html: course.description?.replace(/<\/?p>/g, '') || '' }}></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {currentLesson ? (
            <div className="glass-effect rounded-lg overflow-hidden mb-8">
              {/* Display video if available */}
              {currentLesson.video_url && (
                <VideoPlayer
                  videoUrl={currentLesson.video_url || ''}
                  onProgress={handleVideoProgress}
                  onComplete={handleVideoComplete}
                />
              )}

              <div className="p-6">
                <h2 className="text-2xl font-semibold text-white mb-4">
                  {currentLesson.title}
                </h2>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center text-gray-400">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{currentLesson.duration}m</span>
                  </div>
                  {progress[currentLesson.id] && (
                    <div className="flex items-center text-green-400">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span>Completed</span>
                    </div>
                  )}
                </div>
                
                {/* Lesson Description */}
                <div className="prose prose-invert max-w-none mb-6">
                  {currentLesson.description && (
                    <div 
                      className="text-gray-300" 
                      dangerouslySetInnerHTML={{ __html: currentLesson.description.replace(/<\/?p>/g, '') }} 
                    />
                  )}
                </div>

                {/* Code Editor */}
                {currentLesson.type === 'code' && (
                  <div className="mb-8">
                    {currentLesson.content?.instructions && (
                      <div className="bg-gray-800 rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-medium text-white mb-2">Instructions</h3>
                        <p className="text-gray-300 whitespace-pre-wrap">
                          {currentLesson.content.instructions}
                        </p>
                      </div>
                    )}
                    <CodeEditor
                      defaultLanguage={currentLesson.content?.language || 'javascript'}
                      defaultValue={currentLesson.content?.code_template || ''}
                      lessonId={currentLesson.id}
                      onSave={async (contentProgress: any) => {
                        if (!user) return;
                        try {
                          await supabase.from('progress').upsert({
                            user_id: user.id,
                            lesson_id: currentLesson.id,
                            course_id: courseId,
                            content_progress: contentProgress,
                            updated_at: new Date().toISOString()
                          }, {
                            onConflict: 'user_id,lesson_id'
                          });
                        } catch (error) {
                          console.error('Error saving code progress:', error);
                          setError('Failed to save code progress');
                        }
                      }}
                    />
                  </div>
                )}

                {/* Quiz */}
                {currentLesson.type === 'quiz' && (
                    <Quiz
                      questions={currentLesson.content?.questions || []}
                      onComplete={handleQuizComplete}
                      lessonId={currentLesson.id}
                      courseId={courseId}
                    />
                  )}

                {/* Navigation Controls */}
                <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-800">
                  <Button
                    variant="outline"
                    onClick={() => prevLesson && handleLessonClick(prevLesson)}
                    disabled={!prevLesson}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous Lesson
                  </Button>

                  {progress[currentLesson.id] ? (
                    nextLesson ? (
                      <Button
                        onClick={() => {
                          handleLessonClick(nextLesson);
                          setShowQuiz(false);
                        }}
                        disabled={nextLesson.is_locked}
                        className="bg-gradient-to-r from-[#ff6600] to-[#ff944d]"
                      >
                        Next Lesson
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button onClick={() => navigate('/dashboard')}>
                        Complete Course
                      </Button>
                    )
                  ) : (
                    <Button onClick={handleComplete}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Lesson
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-effect rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-200 mb-4">
                Select a lesson to begin
              </h2>
              <p className="text-gray-400">
                Choose a lesson from the curriculum to start learning
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Progress */}
          <div className="glass-effect rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Course Progress</h3>
            <div className="space-y-4">
              {/* Use a Set to track titles we've already rendered */}
              {(() => {
                const renderedTitles = new Set<string>();
                return lessons.map((lesson) => {
                  // Skip if we've already rendered a lesson with this title
                  if (renderedTitles.has(lesson.title)) {
                    return null;
                  }
                  renderedTitles.add(lesson.title);
                  
                  return (
                <div
                  key={lesson.id}
                  className={`p-4 rounded-lg transition-colors ${
                    lesson.is_locked && !progress[lesson.id]
                      ? 'bg-gray-800/50 cursor-not-allowed'
                      : 'glass-effect hover:bg-gray-800/50 cursor-pointer'
                  }`}
                  onClick={() => (!lesson.is_locked || progress[lesson.id]) && handleLessonClick(lesson)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {lesson.is_locked && !progress[lesson.id] ? (
                        <Lock className="h-5 w-5 text-red-500" />
                      ) : progress[lesson.id] ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Play className="h-5 w-5 text-blue-500" />
                      )}
                      <h4 className="font-medium text-gray-200">{lesson.title}</h4>
                    </div>
                    {lesson.duration && (
                      <div className="flex items-center text-gray-400">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">{lesson.duration}m</span>
                      </div>
                    )}
                  </div>
                  {lesson.description && (
                    <div 
                      className={`text-sm ${lesson.is_locked && !progress[lesson.id] ? 'text-gray-500' : 'text-gray-400'} ml-8`}
                      dangerouslySetInnerHTML={{ __html: lesson.description.replace(/<\/?p>/g, '') }}
                    />
                  )}
                </div>
                );
                })
              })()}
            </div>
          </div>

          {/* Assignments */}
          {assignments.length > 0 && (
            <div className="glass-effect rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Assignments</h3>
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="glass-effect rounded-lg p-4 hover:bg-gray-800/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-200">{assignment.title}</h4>
                      <div className="flex items-center text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="text-sm">
                          {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {assignment.description && (
                      <div 
                        className="text-xs text-gray-400"
                        dangerouslySetInnerHTML={{ __html: assignment.description.replace(/<\/?p>/g, '') || '' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}