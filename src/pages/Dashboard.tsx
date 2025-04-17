import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../lib/auth';
import {
  BookOpen,
  Calendar,
  Clock,
  Award,
  Bell,
  ChevronRight,
  GraduationCap,
  FileText,
  AlertCircle
} from 'lucide-react';
import type { Course } from '../types';

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  course_title: string;
  priority: 'high' | 'medium' | 'low';
}

interface Grade {
  id: string;
  course_title: string;
  assignment_title: string;
  score: number;
  max_score: number;
  date: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<(Course & { progress: number })[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications] = useState([
    { id: 1, text: 'New assignment due tomorrow', type: 'urgent' },
    { id: 2, text: 'Grade posted for JavaScript Basics', type: 'info' }
  ]);

  const fetchAssignments = async (userId: string) => {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        due_date,
        priority,
        courses!inner (
          title
        )
      `)
      .gt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(3);

    if (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }

    return data.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      due_date: assignment.due_date,
      course_title: assignment.courses.title,
      priority: assignment.priority
    }));
  };

  const calculateProgress = (completedLessons: number, totalLessons: number) => {
    if (totalLessons === 0) return 0;
    return Math.round((completedLessons / totalLessons) * 100);
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        if (!user?.id) {
          console.log('No user logged in');
          return;
        }

        // Fetch courses with detailed progress info
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            *,
            lessons:lessons(id),
            progress:progress(completed, lesson_id)
          `)
          .order('created_at', { ascending: false })
          .limit(4);

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

        // Fetch assignments
        const assignments = await fetchAssignments(user.id);
        setAssignments(assignments);

      // Fetch grades (mock data for now)
      setGrades([
        {
          id: '1',
          course_title: 'Python Basics',
          assignment_title: 'Functions Quiz',
          score: 95,
          max_score: 100,
          date: '2025-03-15'
        },
        {
          id: '2',
          course_title: 'Web Development',
          assignment_title: 'HTML Project',
          score: 88,
          max_score: 100,
          date: '2025-03-14'
        }
      ]);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set empty defaults on error
        setCourses([]);
        setAssignments([]);
        setGrades([]);
      }
      setLoading(false);
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const getPriorityColor = (priority: Assignment['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-400/10';
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'low':
        return 'text-green-400 bg-green-400/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-gray-400 mt-1">Here's an overview of your learning progress</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Button variant="ghost" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {notifications.length}
              </span>
            </Button>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-medium">
              {user?.full_name?.[0]?.toUpperCase() || 'S'}
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-200">{user?.full_name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Courses</p>
              <p className="text-2xl font-bold gradient-text">{courses.length}</p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Assignments Due</p>
              <p className="text-2xl font-bold gradient-text">{assignments.length}</p>
            </div>
            <FileText className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Average Grade</p>
              <p className="text-2xl font-bold gradient-text">92%</p>
            </div>
            <Award className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Study Time</p>
              <p className="text-2xl font-bold gradient-text">24h</p>
            </div>
            <Clock className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Courses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Current Courses</h2>
            <Button variant="ghost" onClick={() => navigate('/courses')}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="glass-effect rounded-lg overflow-hidden card-hover cursor-pointer"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <img
                  src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'}
                  alt={course.title}
                  className="w-full h-32 object-cover bg-gray-800"
                  onError={(e) => {
                    // If image fails to load, replace with default
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3';
                  }}
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-200 mb-2">{course.title}</h3>
                  <div className="mb-3">
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#ff6600] to-[#ff944d] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {course.completedLessons} of {course.totalLessons} lessons complete ({course.progress}%)
                    </p>
                  </div>
                  <Button size="sm" className="w-full">
                    Continue Learning
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-8">
          {/* Upcoming Assignments */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Upcoming Assignments</h2>
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="glass-effect rounded-lg p-4 hover:bg-gray-800/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-200">{assignment.title}</h3>
                      <p className="text-sm text-gray-400">{assignment.course_title}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-400">
                    <Clock className="h-4 w-4 mr-1" />
                    Due {new Date(assignment.due_date).toLocaleDateString()} at {new Date(assignment.due_date).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {assignments.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  <p>No upcoming assignments</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Grades */}
          <div className="glass-effect rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Recent Grades</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/gradebook')}
              >
                <GraduationCap className="h-4 w-4 mr-1" />
                Gradebook
              </Button>
            </div>
            <div className="space-y-4">
              {grades.map((grade) => (
                <div key={grade.id} className="glass-effect rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-200">{grade.assignment_title}</h3>
                      <p className="text-sm text-gray-400">{grade.course_title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold gradient-text">
                        {Math.round((grade.score / grade.max_score) * 100)}%
                      </p>
                      <p className="text-sm text-gray-400">
                        {grade.score}/{grade.max_score}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Notifications</h2>
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="glass-effect rounded-lg p-4 flex items-start space-x-3"
                >
                  <div className={`mt-1 ${
                    notification.type === 'urgent' ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <p className="text-gray-300">{notification.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}