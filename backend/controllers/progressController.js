import supabase from '../config/supabase.js';
import { mapDocument } from '../utils/formatDb.js';

export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { count: totalDocuments } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: totalFlashcardSets } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: totalQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: completedQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    const { data: flashcardSets } = await supabase
      .from('flashcards')
      .select('cards')
      .eq('user_id', userId);

    let totalFlashcards = 0;
    let totalFlashcardsReviewed = 0;
    let staredFlashcards = 0;

    (flashcardSets || []).forEach((set) => {
      const cards = set.cards || [];
      totalFlashcards += cards.length;
      totalFlashcardsReviewed += cards.filter((card) => (card.reviewCount || 0) > 0).length;
      staredFlashcards += cards.filter((card) => card.isStarred).length;
    });

    const { data: completedQuizRows } = await supabase
      .from('quizzes')
      .select('score')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    const averageScore =
      completedQuizRows && completedQuizRows.length > 0
        ? Math.round(
            (completedQuizRows.reduce((sum, quiz) => sum + (quiz.score || 0), 0) / completedQuizRows.length) * 100
          ) / 100
        : 0;

    const { data: recentDocuments } = await supabase
      .from('documents')
      .select('id, title, filename, last_accessed, status')
      .eq('user_id', userId)
      .order('last_accessed', { ascending: false })
      .limit(5);

    const { data: recentQuizzes } = await supabase
      .from('quizzes')
      .select('id, title, score, total_questions, completed_at, documents:document_id(id, title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const studyStrea = Math.floor(Math.random() * 30);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalDocuments: totalDocuments || 0,
          totalFlashcardSets: totalFlashcardSets || 0,
          totalFlashcards,
          totalFlashcardsReviewed,
          staredFlashcards,
          totalQuizzes: totalQuizzes || 0,
          completedQuizzes: completedQuizzes || 0,
          averageScore,
          studyStrea,
        },
        recentActivities: {
          documents: (recentDocuments || []).map((doc) => mapDocument(doc)),
          quizzes: (recentQuizzes || []).map((quiz) => ({
            _id: quiz.id,
            title: quiz.title,
            score: quiz.score,
            totalQuestions: quiz.total_questions,
            completedAt: quiz.completed_at,
            documentId: quiz.documents
              ? { _id: quiz.documents.id, title: quiz.documents.title }
              : null,
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
