import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Plus, Edit, Trash2, Languages, Users, Clock, Calendar, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

type CourseStatus = 'all' | 'mine' | 'published' | 'draft' | 'pending' | 'scheduled' | 'private' | 'trash';

export function CourseManager() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<CourseStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Category');
  const [sortBy, setSortBy] = useState('DESC');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchCourses();
  }, [currentStatus, searchQuery, selectedCategory, sortBy, selectedDate]);

  async function fetchCourses() {
    setLoading(true);
    try {
      let query = supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: sortBy === 'ASC' });

      // Apply filters
      if (currentStatus !== 'all') {
        query = query.eq('status', currentStatus);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (selectedCategory !== 'All Category') {
        query = query.eq('category', selectedCategory);
      }

      if (selectedDate) {
        query = query.gte('created_at', selectedDate)
          .lt('created_at', new Date(new Date(selectedDate).getTime() + 86400000).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      // First delete all lessons to trigger video cleanup
      const { error: lessonsError } = await supabase
        .from('lessons')
        .delete()
        .eq('course_id', courseId);

      if (lessonsError) throw lessonsError;

      // Then delete the course
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      setCourses(courses.filter(course => course.id !== courseId));
      
      // Refresh the course list
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'public':
        return `${baseClasses} bg-green-500/20 text-green-400`;
      case 'draft':
        return `${baseClasses} bg-gray-500/20 text-gray-400`;
      case 'private':
        return `${baseClasses} bg-yellow-500/20 text-yellow-400`;
      case 'scheduled':
        return `${baseClasses} bg-purple-500/20 text-purple-400`;
      default:
        return `${baseClasses} bg-blue-500/20 text-blue-400`;
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
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold gradient-text">Course Management</h1>
        <Button onClick={() => navigate('/admin/courses/new')}>
          <Plus className="h-5 w-5 mr-2" />
          Create Course
        </Button>
      </div>

      <div className="glass-effect rounded-lg p-6 mb-8">
        <div className="flex flex-wrap gap-4 mb-6">
          <Button
            variant={currentStatus === 'all' ? 'primary' : 'ghost'}
            onClick={() => setCurrentStatus('all')}
          >
            All ({courses.length})
          </Button>
          <Button
            variant={currentStatus === 'mine' ? 'primary' : 'ghost'}
            onClick={() => setCurrentStatus('mine')}
          >
            Mine (0)
          </Button>
          <Button
            variant={currentStatus === 'published' ? 'primary' : 'ghost'}
            onClick={() => setCurrentStatus('published')}
          >
            Published (0)
          </Button>
          <Button
            variant={currentStatus === 'draft' ? 'primary' : 'ghost'}
            onClick={() => setCurrentStatus('draft')}
          >
            Draft (0)
          </Button>
          <Button
            variant={currentStatus === 'pending' ? 'primary' : 'ghost'}
            onClick={() => setCurrentStatus('pending')}
          >
            Pending (0)
          </Button>
          <Button
            variant={currentStatus === 'scheduled' ? 'primary' : 'ghost'}
            onClick={() => setCurrentStatus('scheduled')}
          >
            Scheduled (0)
          </Button>
          <Button
            variant={currentStatus === 'private' ? 'primary' : 'ghost'}
            onClick={() => setCurrentStatus('private')}
          >
            Private (0)
          </Button>
          <Button
            variant={currentStatus === 'trash' ? 'primary' : 'ghost'}
            onClick={() => setCurrentStatus('trash')}
          >
            Trash (0)
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option>All Category</option>
              <option>Programming</option>
              <option>Web Development</option>
              <option>Mobile Development</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="DESC">Newest First</option>
              <option value="ASC">Oldest First</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img
                        src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'}
                        alt={course.title}
                        className="h-10 w-10 rounded object-cover bg-gray-800"
                        onError={(e) => {
                          // If image fails to load, replace with default
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3';
                        }}
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{course.title}</div>
                        <div className="text-sm text-gray-400">{course.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={getStatusBadgeClass(course.status)}>
                      {course.visibility || 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    ${course.price || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {format(new Date(course.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/admin/courses/${course.id}`)}
                    >
                      <Edit className="h-4 w-4 text-[#ff6600]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(course.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No courses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}