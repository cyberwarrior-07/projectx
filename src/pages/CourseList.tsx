import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Code, BookOpen, Lock, GraduationCap, Users, Star } from 'lucide-react';
import type { Course, Progress } from '../types';

interface CourseWithProgress extends Course {
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lessons: { id: string }[];
}

export function CourseList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const isEnrolled = (course: CourseWithProgress) => {
    return course.completedLessons > 0;
  };

  const handleEnroll = (courseId: string) => {
    if (!user) {
      navigate('/auth', { state: { courseId } });
      return;
    }
    navigate(`/courses/${courseId}`);
  };

  useEffect(() => {
    async function fetchCourses() {
      try {
        // Fetch courses with lessons count
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            *,
            lessons:lessons(id),
            progress:progress(completed, lesson_id)
          `)
          .order('created_at', { ascending: false });

        if (coursesError) throw coursesError;
        
        // Calculate accurate progress for each course
        const coursesWithProgress = coursesData.map(course => {
          // Ensure we're counting lessons and progress correctly
          const totalLessons = course.lessons?.length || 0;
          const completedLessons = course.progress?.filter(p => p.completed)?.length || 0;
          
          // Calculate progress percentage correctly
          const progressPercentage = totalLessons > 0 ? 
            Math.round((completedLessons / totalLessons) * 100) : 0;
          
          return {
            ...course,
            totalLessons,
            completedLessons,
            progress: progressPercentage
          };
        });

        setCourses(coursesWithProgress);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
      setLoading(false);
    }

    fetchCourses();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold gradient-text mb-4">Discover Your Next Learning Adventure</h1>
          <p className="text-xl text-gray-400">
            {user ? 'Continue your learning journey with our expert-led courses' 
                 : 'Join thousands of learners mastering programming through interactive courses'}
          </p>
        </div>
        {!user && (
          <Button size="lg" onClick={() => navigate('/auth')}>
            <GraduationCap className="h-5 w-5 mr-2" />
            Start Learning
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="glass-effect rounded-lg p-8 text-center">
          <BookOpen className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-200 mb-2">No Courses Available</h2>
          <p className="text-gray-400">Check back later for new course offerings.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const enrolled = isEnrolled(course);
          
          return (
            <div
              key={course.id}
              className="glass-effect rounded-lg overflow-hidden card-hover relative group"
            >
              <div className="relative">
                <img
                  src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'}
                  alt={course.title}
                  className="w-full h-48 object-cover bg-gray-800"
                  onError={(e) => {
                    // If image fails to load, replace with default
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3';
                  }}
                />
                {!user && (
                  <div className="absolute top-4 right-4 bg-gray-900/90 px-3 py-1.5 rounded-full flex items-center shadow-lg">
                    <Lock className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-sm text-yellow-400">Login to Enroll</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60" />
              </div>
              <div className="p-6 relative">
                <h2 className="text-xl font-semibold text-gray-200 mb-2">{course.title}</h2>
                <div 
                  className="text-gray-400 mb-6 line-clamp-2" 
                  dangerouslySetInnerHTML={{ __html: course.description }}
                />
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center text-sm text-gray-400">
                    <Code className="h-4 w-4 mr-2 text-blue-400" />
                    <span>Interactive coding exercises</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <GraduationCap className="h-4 w-4 mr-2 text-green-400" />
                    <span>{course.totalLessons} Lessons</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Users className="h-4 w-4 mr-2 text-purple-400" />
                    <span>Expert Support</span>
                  </div>
                </div>
                
                {enrolled ? (
                  <>
                    <div className="mb-4">
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(course.progress, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-400 mt-2 flex items-center justify-between">
                        <span>{Math.round(course.progress)}% complete</span>
                        <span>{course.completedLessons} / {course.totalLessons} lessons</span>
                      </p>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      Continue Learning
                    </Button>
                  </>
                ) : (
                  <Button className="w-full" onClick={() => handleEnroll(course.id)}>
                    Enroll Now
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>)}

      {/* Course Benefits */}
      <div className="mt-16 glass-effect rounded-lg p-8">
        <h2 className="text-2xl font-bold gradient-text mb-8 text-center">Why Learn With Us?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <Code className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Interactive Learning</h3>
            <p className="text-gray-400">Practice coding in real-time with our built-in code editor</p>
          </div>
          <div className="text-center">
            <Users className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Expert Support</h3>
            <p className="text-gray-400">Get help from our community of developers and instructors</p>
          </div>
          <div className="text-center">
            <Star className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Project-Based</h3>
            <p className="text-gray-400">Build real-world projects to reinforce your learning</p>
          </div>
        </div>
      </div>
    </div>
  );
}