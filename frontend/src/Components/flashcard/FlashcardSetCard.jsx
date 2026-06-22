import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Sparkles, TrendingUp, BookMarked } from 'lucide-react'
import moment from 'moment'
import toast from 'react-hot-toast'
import {
  getFlashcardCards,
  getFlashcardDocumentId,
  getFlashcardDocumentTitle,
  getReviewedCount,
} from '../../utils/flashcardHelpers.js'

const FlashcardSetCard = ({ flashcardSet }) => {
  const navigate = useNavigate()
  const cards = getFlashcardCards(flashcardSet)
  const totalCards = cards.length
  const reviewedCount = getReviewedCount(flashcardSet)
  const progressPercentage = totalCards > 0 ? Math.round((reviewedCount / totalCards) * 100) : 0
  const documentTitle = getFlashcardDocumentTitle(flashcardSet)

  const handleStudyNow = () => {
    const documentId = getFlashcardDocumentId(flashcardSet)
    if (!documentId) {
      toast.error('This flashcard set is missing its source document')
      return
    }

    const params = new URLSearchParams({ setId: flashcardSet._id })
    navigate(`/documents/${documentId}/flashcards?${params.toString()}`)
  }

  return (
    <article
      onClick={handleStudyNow}
      className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:shadow-slate-900/40 cursor-pointer"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-2">
              <BookMarked className="h-4 w-4" /> Flashcard Set
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate" title={documentTitle}>
              {documentTitle}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalCards} card{totalCards === 1 ? '' : 's'} · Created{' '}
              {flashcardSet.createdAt ? moment(flashcardSet.createdAt).fromNow() : 'recently'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-2">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Cards</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{totalCards}</p>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-2">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Reviewed</p>
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{progressPercentage}%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>Study progress</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {reviewedCount}/{totalCards} reviewed
          </span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all"
            style={{ width: `${progressPercentage}%` }}
            aria-label="Flashcard review progress"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {totalCards === 0
            ? 'No cards in this set yet.'
            : progressPercentage === 100
              ? 'Great job! All cards reviewed.'
              : 'Keep the streak going.'}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleStudyNow()
          }}
          disabled={totalCards === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          Study now
        </button>
      </div>
    </article>
  )
}

export default FlashcardSetCard
