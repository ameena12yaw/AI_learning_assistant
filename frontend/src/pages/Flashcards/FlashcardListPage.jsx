import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import flashcardService from '../../services/flashcardService.js'
import PageHeader from '../../Components/common/PageHeader.jsx'
import Spinner from '../../Components/common/Spinner.jsx'
import EmptyState from '../../Components/common/EmptyState.jsx'
import FlashcardSetCard from '../../Components/flashcard/FlashcardSetCard.jsx'
import toast from 'react-hot-toast'

const FlashcardListPage = () => {
  const [flashcardSets, setFlashcardSets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFlashcardSets = async () => {
      try {
        const res = await flashcardService.getAllFlashcardSets()
        const sets = Array.isArray(res?.data) ? res.data : []
        setFlashcardSets(sets)
      } catch (error) {
        console.error('Error fetching flashcard sets:', error)
        toast.error(error.message || 'Failed to load flashcard sets')
        setFlashcardSets([])
      } finally {
        setLoading(false)
      }
    }

    fetchFlashcardSets()
  }, [])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      )
    }

    if (flashcardSets.length === 0) {
      return (
        <EmptyState
          title="No Flashcard Sets"
          description="Generate flashcards from a document to see them listed here."
        />
      )
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {flashcardSets.map((set) => (
          <FlashcardSetCard key={set._id} flashcardSet={set} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Flashcard Sets"
        subtitle={
          loading
            ? 'Loading your flashcard sets...'
            : `${flashcardSets.length} set${flashcardSets.length === 1 ? '' : 's'} across your documents`
        }
      />
      {renderContent()}
      {!loading && flashcardSets.length === 0 && (
        <div className="text-center">
          <Link
            to="/documents"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Go to Documents
          </Link>
        </div>
      )}
    </div>
  )
}

export default FlashcardListPage
