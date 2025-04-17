import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/auth';
import { Award, TrendingUp, AlertCircle, FileText, CheckCircle, Clock } from 'lucide-react';

interface Grade {
  id: string;
  course_title: string;
  quiz_title: string;
  score: number;
  max_score: number;
  completed_at: string;
  type: 'quiz' | 'assignment';
  description?: string;
  due_date?: string;
}

export function Gradebook() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallGrade, setOverallGrade] = useState(0);
  const [needsImprovement, setNeedsImprovement] = useState(0);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    async function fetchAllGrades() {
      if (!user?.id) return;

      try {
        // Fetch quiz attempts with course and lesson info
        const { data: attempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select(`
            id,
            correct_answers,
            total_questions,
            score_percentage,
            completed_at,
            lessons (
              title,
              description,
              courses (
                title
              )
            )
          `)
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (attemptsError) throw attemptsError;

        // Format attempts into grades
        const formattedGrades = attempts?.map(attempt => ({
          id: attempt.id,
          course_title: attempt.lessons.courses.title,
          quiz_title: attempt.lessons.title,
          score: attempt.score_percentage,
          max_score: 100, // Quiz scores are stored as percentages
          completed_at: attempt.completed_at,
          correct_answers: attempt.correct_answers,
          total_questions: attempt.total_questions,
          type: 'quiz',
          description: progress.lessons.description
        }));

        // Calculate overall statistics
        const totalScore = formattedGrades.reduce((acc, grade) => 
          acc + (grade.score / grade.max_score), 0);
        const averageGrade = formattedGrades.length > 0 
          ? (totalScore / formattedGrades.length) * 100 
          : 0;

        // Count grades needing improvement (below 70%)
        const lowGrades = formattedGrades.filter(
          grade => (grade.score / grade.max_score) * 100 < 70
        ).length;

        setGrades(formattedGrades);
        setQuizAttempts(attempts || []);
        setOverallGrade(averageGrade);
        setNeedsImprovement(lowGrades);
      } catch (error) {
        console.error('Error fetching grades:', error);
        setGrades([]);
        setOverallGrade(0);
        setNeedsImprovement(0);
      }
      setLoading(false);
    }

    fetchAllGrades();
  }, [user?.id]);

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 80) return 'text-blue-400';
    if (percentage >= 70) return 'text-yellow-400';
    return 'text-red-400';
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
      <h1 className="text-3xl font-bold gradient-text mb-8">Gradebook</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Overall Grade</p>
              <p className={`text-3xl font-bold ${getGradeColor(overallGrade)}`}>
                {overallGrade.toFixed(1)}%
              </p>
            </div>
            <Award className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Completed Quizzes</p>
              <p className="text-3xl font-bold gradient-text">{grades.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Needs Improvement</p>
              <p className="text-3xl font-bold text-yellow-400">{needsImprovement}</p>
              <p className="text-xs text-gray-400">
                Scores below 70%
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                Quiz
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {grades.map((grade) => {
              const percentage = (grade.score / grade.max_score) * 100;
              return (
                <tr key={grade.id}>
                  <td className="px-6 py-4 text-sm text-gray-200">
                    {grade.course_title}
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        {grade.quiz_title}
                      </p>
                      {grade.description && (
                        <p className="text-xs text-gray-400 mt-1">
                          {grade.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${getGradeColor(percentage)}`}>
                        {grade.correct_answers} / {grade.total_questions} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(grade.completed_at).toLocaleDateString()} at {new Date(grade.completed_at).toLocaleTimeString()}
                  </td>
                </tr>
              );
            })}
            {grades.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  <p>No grades available yet</p>
                  <p className="text-sm mt-2">Complete quizzes and assignments to see your grades here</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}