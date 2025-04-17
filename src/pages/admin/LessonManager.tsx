import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Plus, Edit, Trash2, GripVertical, FileQuestion } from 'lucide-react';
import type { Lesson, QuizQuestion } from '../../types';

export function LessonManager() {
  const { courseId } = useParams();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingQuiz, setIsAddingQuiz] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    duration: 0, 
    is_locked: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<{
    title: string;
    questions: QuizQuestion[];
  }>({
    title: '',
    questions: [
      {
        id: '1',
        question: '',
        options: ['', '', '', ''],
        correct_answer: 0,
      },
    ],
  });

  useEffect(() => {
    fetchLessons();
  }, [courseId]);

  async function fetchLessons() {
    if (!courseId) return;

    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_position');

    if (!error && data) {
      setLessons(data);
    }
    setLoading(false);
  }

  const handleDeleteLesson = async (lessonId: string) => {
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (!error) {
      setLessons(lessons.filter(lesson => lesson.id !== lessonId));
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson.id);
    setFormData({
      title: lesson.title,
      description: lesson.description,
      video_url: lesson.video_url,
      duration: lesson.duration,
      is_locked: lesson.is_locked
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return;
    setError(null);

    const { data, error } = await supabase
      .from('lessons')
      .insert([{
        ...formData,
        course_id: courseId,
        order_position: lessons.length + 1,
      }])
      .select()
      .single();

    if (!error && data) {
      setLessons([...lessons, data]);
      setIsCreating(false);
      setFormData({
        title: '',
        description: '',
        video_url: '',
        duration: 0, 
        is_locked: true,
      });
    }
  }

  async function handleQuizSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLesson) return;

    const { error } = await supabase
      .from('quizzes')
      .insert([{
        lesson_id: selectedLesson,
        title: quizData.title,
        questions: quizData.questions,
      }]);

    if (!error) {
      setIsAddingQuiz(false);
      setSelectedLesson(null);
      setQuizData({
        title: '',
        questions: [
          {
            id: '1',
            question: '',
            options: ['', '', '', ''],
            correct_answer: 0,
          },
        ],
      });
    }
  }

  const addQuestion = () => {
    setQuizData({
      ...quizData,
      questions: [
        ...quizData.questions,
        {
          id: (quizData.questions.length + 1).toString(),
          question: '',
          options: ['', '', '', ''],
          correct_answer: 0,
        },
      ],
    });
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
        <h1 className="text-3xl font-bold gradient-text">Lesson Management</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-5 w-5 mr-2" />
          New Lesson
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg mb-8">
          {error}
        </div>
      )}

      {isCreating && (
        <div className="glass-effect rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold gradient-text mb-4">Create New Lesson</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video URL
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_locked}
                onChange={(e) => setFormData({ ...formData, is_locked: e.target.checked })}
                className="bg-gray-800 border-gray-700 rounded text-blue-500"
              />
              <label className="text-sm font-medium text-gray-300">
                Lock this lesson
              </label>
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Lesson
              </Button>
            </div>
          </form>
        </div>
      )}

      {isAddingQuiz && (
        <div className="glass-effect rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold gradient-text mb-4">Add Quiz</h2>
          <form onSubmit={handleQuizSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quiz Title
              </label>
              <input
                type="text"
                value={quizData.title}
                onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                required
              />
            </div>

            {quizData.questions.map((question, qIndex) => (
              <div key={question.id} className="space-y-4 p-4 glass-effect rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Question {qIndex + 1}
                  </label>
                  <input
                    type="text"
                    value={question.question}
                    onChange={(e) => {
                      const newQuestions = [...quizData.questions];
                      newQuestions[qIndex].question = e.target.value;
                      setQuizData({ ...quizData, questions: newQuestions });
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                    required
                  />
                </div>

                {question.options.map((option, oIndex) => (
                  <div key={oIndex}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Option {oIndex + 1}
                      {question.correct_answer === oIndex && ' (Correct)'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newQuestions = [...quizData.questions];
                          newQuestions[qIndex].options[oIndex] = e.target.value;
                          setQuizData({ ...quizData, questions: newQuestions });
                        }}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                        required
                      />
                      <Button
                        type="button"
                        variant={question.correct_answer === oIndex ? 'primary' : 'outline'}
                        onClick={() => {
                          const newQuestions = [...quizData.questions];
                          newQuestions[qIndex].correct_answer = oIndex;
                          setQuizData({ ...quizData, questions: newQuestions });
                        }}
                      >
                        Set Correct
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
              <Plus className="h-5 w-5 mr-2" />
              Add Question
            </Button>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setIsAddingQuiz(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Quiz
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {lessons.map((lesson, index) => (
          <div key={lesson.id} className="glass-effect rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <GripVertical className="h-5 w-5 text-gray-500 cursor-move" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-200">
                    {index + 1}. {lesson.title}
                  </h3>
                  <p className="text-gray-400">{lesson.description}</p>
                  <p className="text-sm text-gray-500">Duration: {lesson.duration} minutes</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedLesson(lesson.id);
                    setIsAddingQuiz(true);
                  }}
                >
                  <FileQuestion className="h-5 w-5 text-blue-400" />
                </Button>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeleteLesson(lesson.id)}
                >
                  <Trash2 className="h-5 w-5 text-red-400" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}