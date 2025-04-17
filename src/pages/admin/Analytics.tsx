import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AnalyticsChart } from '../../components/AnalyticsChart';
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    userGrowth: {
      labels: [],
      datasets: [{
        label: 'New Users',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
      }],
    },
    courseEngagement: {
      labels: [],
      datasets: [{
        label: 'Course Completions',
        data: [],
        backgroundColor: '#10b981',
      }],
    },
  });

  useEffect(() => {
    async function fetchAnalytics() {
      // Fetch analytics data from Supabase
      const { data: users } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at');

      const { data: progress } = await supabase
        .from('progress')
        .select('course_id, completed_at')
        .eq('completed', true)
        .order('completed_at');

      // Process user growth data
      const userDates = users?.map(u => new Date(u.created_at).toLocaleDateString()) || [];
      const userCounts = userDates.reduce((acc: Record<string, number>, date) => {
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Process course engagement data
      const courseDates = progress?.map(p => new Date(p.completed_at).toLocaleDateString()) || [];
      const courseCounts = courseDates.reduce((acc: Record<string, number>, date) => {
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      setData({
        userGrowth: {
          labels: Object.keys(userCounts),
          datasets: [{
            label: 'New Users',
            data: Object.values(userCounts),
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6',
          }],
        },
        courseEngagement: {
          labels: Object.keys(courseCounts),
          datasets: [{
            label: 'Course Completions',
            data: Object.values(courseCounts),
            backgroundColor: '#10b981',
          }],
        },
      });

      setLoading(false);
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold gradient-text">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnalyticsChart
          type="line"
          data={data.userGrowth}
          title="User Growth Over Time"
        />
        <AnalyticsChart
          type="bar"
          data={data.courseEngagement}
          title="Course Completions"
        />
      </div>
    </div>
  );
}