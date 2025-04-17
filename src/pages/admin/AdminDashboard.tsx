import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalCourses: number;
  totalLessons: number;
  activeUsers: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCourses: 0,
    totalLessons: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const [usersCount, coursesCount, lessonsCount] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('courses').select('id', { count: 'exact' }),
        supabase.from('lessons').select('id', { count: 'exact' }),
      ]);

      setStats({
        totalUsers: usersCount.count || 0,
        totalCourses: coursesCount.count || 0,
        totalLessons: lessonsCount.count || 0,
        activeUsers: 0, // This would need a more complex query
      });
    }

    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold gradient-text mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Stats Cards */}
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Users</p>
              <p className="text-3xl font-bold gradient-text">{stats.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Courses</p>
              <p className="text-3xl font-bold gradient-text">{stats.totalCourses}</p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Lessons</p>
              <p className="text-3xl font-bold gradient-text">{stats.totalLessons}</p>
            </div>
            <GraduationCap className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Users</p>
              <p className="text-3xl font-bold gradient-text">{stats.activeUsers}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-effect rounded-lg p-6">
        <h2 className="text-xl font-semibold gradient-text mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {/* Activity items would go here */}
          <p className="text-gray-400">No recent activity to display</p>
        </div>
      </div>
    </div>
  );
}