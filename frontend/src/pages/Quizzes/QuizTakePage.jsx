import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import quizService from '../../services/quizService.js'
import toast from 'react-hot-toast'
import PageHeader from '../../Components/common/PageHeader.jsx'
import Button from '../../Components/common/Button.jsx'
import Spinner from '../../Components/common/Spinner.jsx'


const QuizTakePage = () => {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await quizService.getQuizById(quizId)
        setQuiz(res.data)

      } catch (error) {
        toast.error(error.message || 'Failed to load quiz')
        console.error('Error fetching quiz:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchQuiz()
  }, [quizId])

  const handleOptionChange = (questionId, optionId) => {
    if (!questionId) return
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }))
  }


  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  };


  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  };


  const handleSubmitQuiz = async () => {
    setSubmitting(true)
    try {
      const formattedAnswers = Object.keys(selectedAnswers).map((questionId) => {
        const question = quiz.questions.find(q => q._id === questionId)
        const questionIndex = quiz.questions.findIndex(q => q._id === questionId)
        const optionIndex = selectedAnswers[questionId]
        const selectedAnswer = question.options[optionIndex]
        return { questionIndex, selectedAnswer }
      })
      await quizService.submitQuiz(quizId, formattedAnswers)
      toast.success("Quiz submitted successfully")
      navigate(`/quizzes/${quizId}/results`)
    } catch (error) {
      toast.error(error.message || "Failed to submit quiz")
    } finally {
      setSubmitting(false)
    }


  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!quiz || quiz.questions.length === 0) {
    return <div className="text-center text-slate-500">No quiz data available.</div>
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const answeredCount = Object.keys(selectedAnswers).length


  return (
    <div className="space-y-6">
      <PageHeader title={`Taking Quiz: ${quiz.title}`} />

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Question {currentQuestionIndex + 1} of {quiz.questions.length} · Answered {answeredCount}/{quiz.questions.length}
          </div>
          <div className="w-full sm:w-64">
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all"
                style={{ width: `${Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}%` }}
                aria-label="Quiz progress"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Question {currentQuestionIndex + 1}</div>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{currentQuestion.question || currentQuestion.text}</h2>
        </div>

        <div className="mt-5 grid gap-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswers[currentQuestion._id] === index

            return (
              <label
                key={index}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${isSelected
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 ring-2 ring-emerald-200 dark:ring-emerald-800'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-emerald-200 dark:hover:border-emerald-800'
                  }`}
              >
                <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
                  <input
                    type="radio"
                    name={`question-${currentQuestion._id}`}
                    value={index}
                    checked={isSelected}
                    onChange={() => handleOptionChange(currentQuestion._id, index)}
                    className="h-4 w-4 text-emerald-600"
                  />
                  <span className="text-sm font-medium">{option}</span>
                </div>
              </label>
            )
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {quiz.questions.map((question, index) => {
              const questionId = question?._id?.toString?.() ?? ''
              const isCurrent = index === currentQuestionIndex
              const isAnswered = questionId && selectedAnswers.hasOwnProperty(questionId)
              return (
                <button
                  key={questionId || index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`h-10 w-10 rounded-full border text-sm font-semibold transition ${isCurrent
                      ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : isAnswered
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  aria-label={`Go to question ${index + 1}`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} variant="secondary">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <Button onClick={handleNextQuestion}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmitQuiz} disabled={submitting}>
                {submitting ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit Quiz
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuizTakePage