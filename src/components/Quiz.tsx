import { useState } from 'react';
import { Button } from './ui/Button';
import { CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { QuizQuestion } from '../types';

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
  lessonId?: string;
  courseId?: string;
}

export function Quiz({ questions, onComplete, lessonId, courseId }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState<boolean[]>(new Array(questions.length).fill(false));
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [answers, setAnswers] = useState<{question: string; answer: string; correct: boolean}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate questions array
  const validQuestions = questions.filter(q => 
    q.question?.trim() && 
    Array.isArray(q.options) && 
    q.options.length > 0 &&
    typeof q.correctAnswer === 'number' &&
    q.correctAnswer >= 0 &&
    q.correctAnswer < q.options.length
  );

  const handleAnswer = (answerIndex: number) => {
    if (submitted[currentQuestion]) return;
    setSelectedAnswer(answerIndex);
    
    // Record answer
    const currentQ = validQuestions[currentQuestion];
    setAnswers([...answers, {
      question: currentQ.question,
      answer: currentQ.options[answerIndex],
      correct: answerIndex === currentQ.correctAnswer
    }]);
  };

  const handleNext = async () => {
    if (selectedAnswer === null) return;
    setIsSubmitting(true);

    const isAnswerCorrect = selectedAnswer === validQuestions[currentQuestion].correctAnswer;
    if (isAnswerCorrect) {
      setScore(score + 1);
    }

    // Show feedback
    setIsCorrect(isAnswerCorrect);
    setShowFeedback(true);

    // Mark current question as submitted
    const newSubmitted = [...submitted];
    newSubmitted[currentQuestion] = true;
    setSubmitted(newSubmitted);

    // Wait for feedback animation
    setTimeout(async () => {
      setShowFeedback(false);
      if (currentQuestion < validQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setShowResult(true);
        onComplete(score + (isAnswerCorrect ? 1 : 0));
        
        // Save quiz attempt to database if lessonId and courseId are provided
        if (lessonId && courseId) {
          try {
            const finalScore = score + (isAnswerCorrect ? 1 : 0);
            const totalQuestions = validQuestions.length;
            const scorePercentage = Math.round((finalScore / totalQuestions) * 100);
            
            await supabase.from('quiz_attempts').insert({
              user_id: (await supabase.auth.getUser()).data.user?.id,
              lesson_id: lessonId,
              course_id: courseId,
              answers: answers,
              correct_answers: finalScore,
              total_questions: totalQuestions,
              score_percentage: scorePercentage
            });
          } catch (error) {
            console.error('Error saving quiz attempt:', error);
          }
        }
      }
      setIsSubmitting(false);
    }, 1000);
  };

  // If no valid questions, show error
  if (validQuestions.length === 0) {
    return (
      <div className="glass-effect rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold text-red-400 mb-4">Quiz Error</h2>
        <p className="text-gray-300">
          No valid questions found. Please contact support.
        </p>
      </div>
    );
  }

  if (showResult) {
    const finalScore = score;
    const totalQuestions = validQuestions.length;
    const percentage = Math.round((finalScore / totalQuestions) * 100);

    return (
      <div className="glass-effect rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold gradient-text mb-4">Quiz Complete!</h2>
        <div className="space-y-6">
          <p className="text-xl text-gray-300 mb-4">
            Your score: {finalScore} out of {totalQuestions}
          </p>
          <div className="inline-block glass-effect px-6 py-3 rounded-lg">
            <p className="text-2xl font-bold gradient-text">
              {percentage}%
            </p>
          </div>
          
          {/* Show detailed results */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-white mb-4">Question Summary</h3>
            <div className="space-y-4">
              {answers.map((answer, index) => (
                <div key={index} className={`p-4 rounded-lg ${
                  answer.correct ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  <p className="text-gray-200 font-medium">{answer.question}</p>
                  <p className="text-sm text-gray-400 mt-1">Your answer: {answer.answer}</p>
                  <div className="flex items-center mt-2">
                    {answer.correct ? (
                      <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 mr-2" />
                    )}
                    <span className={answer.correct ? 'text-green-400' : 'text-red-400'}>
                      {answer.correct ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="text-gray-400">
          {percentage >= 80 ? (
            <p>Excellent work! You've mastered this topic.</p>
          ) : percentage >= 60 ? (
            <p>Good job! Keep practicing to improve further.</p>
          ) : (
            <p>You might want to review this topic again.</p>
          )}
        </div>
      </div>
    );
  }

  const question = validQuestions[currentQuestion];

  return (
    <div className="glass-effect rounded-lg p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold gradient-text">
            Question {currentQuestion + 1} of {validQuestions.length}
          </h3>
          <div className="text-sm text-gray-400">
            Score: {score}/{currentQuestion}
          </div>
        </div>
        <p className="text-lg text-gray-200 mb-6">{question.question}</p>
        <div className="space-y-4">
          {question.options.map((option, index) => (
            <button
              key={index}
              className={`w-full text-left p-4 rounded-lg transition-all ${
                selectedAnswer === index
                  ? submitted[currentQuestion]
                    ? isCorrect
                      ? 'glass-effect border-2 border-green-500 text-green-400 bg-green-500/10'
                      : 'glass-effect border-2 border-red-500 text-red-400 bg-red-500/10'
                    : 'glass-effect border-2 border-[#ff6600] text-[#ff6600] bg-[#ff6600]/10'
                  : 'glass-effect hover:bg-gray-800/50 text-white hover:border-2 hover:border-gray-600'
              }`}
              onClick={() => handleAnswer(index)}
              disabled={submitted[currentQuestion]}
            >
              <div className="flex items-center">
                <div className="flex-1 flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    selectedAnswer === index
                      ? submitted[currentQuestion]
                        ? isCorrect
                          ? 'border-green-500 bg-green-500'
                          : 'border-red-500 bg-red-500'
                        : 'border-[#ff6600] bg-[#ff6600]'
                      : 'border-gray-500'
                  }`} />
                  {option}
                </div>
                {showFeedback && selectedAnswer === index && (
                  <div className="ml-2">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={selectedAnswer === null || showFeedback || isSubmitting}
          size="lg"
        >
          {currentQuestion === validQuestions.length - 1 ? 'Finish' : 'Next Question'}
        </Button>
      </div>
    </div>
  );
}