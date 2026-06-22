export function getFlashcardDocumentId(flashcardSet) {
  if (!flashcardSet?.documentId) return null;
  if (typeof flashcardSet.documentId === 'string') return flashcardSet.documentId;
  return flashcardSet.documentId._id || null;
}

export function getFlashcardDocumentTitle(flashcardSet) {
  if (typeof flashcardSet?.documentId === 'object' && flashcardSet.documentId?.title) {
    return flashcardSet.documentId.title;
  }
  return flashcardSet?.document?.title || 'Untitled document';
}

export function getFlashcardCards(flashcardSet) {
  return Array.isArray(flashcardSet?.cards) ? flashcardSet.cards : [];
}

export function getReviewedCount(flashcardSet) {
  return getFlashcardCards(flashcardSet).filter(
    (card) => card.lastReviewed || (card.reviewCount || 0) > 0
  ).length;
}
