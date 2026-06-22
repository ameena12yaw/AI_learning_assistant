import supabase from '../config/supabase.js';
import { mapFlashcardSet, isValidUuid, normalizeDocumentRef } from '../utils/formatDb.js';

const formatDocumentRef = (doc) => normalizeDocumentRef(doc);

const findFlashcardSetByCardId = async (cardId, userId) => {
  const { data: sets, error } = await supabase
    .from('flashcards')
    .select('*, documents:document_id(id, title, filename)')
    .eq('user_id', userId);

  if (error) throw error;

  for (const set of sets || []) {
    const cardIndex = (set.cards || []).findIndex((card) => card._id === cardId);
    if (cardIndex !== -1) {
      return { set, cardIndex };
    }
  }

  return null;
};

const isSetUnreviewed = (set) => {
  const cards = set.cards || [];
  if (cards.length === 0) return false;
  return cards.every((card) => !card.lastReviewed && (card.reviewCount || 0) === 0);
};

export const getFlashcards = async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.documentId)) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const { data: flashcards, error } = await supabase
      .from('flashcards')
      .select('*, documents:document_id(id, title, filename)')
      .eq('user_id', req.user._id)
      .eq('document_id', req.params.documentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (flashcards || []).map((row) =>
      mapFlashcardSet(row, formatDocumentRef(row.documents))
    );

    res.status(200).json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewReminders = async (req, res, next) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: flashcardSets, error } = await supabase
      .from('flashcards')
      .select('*, documents:document_id(id, title, filename)')
      .eq('user_id', req.user._id)
      .lt('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const reminders = (flashcardSets || [])
      .filter(isSetUnreviewed)
      .map((row) => mapFlashcardSet(row, formatDocumentRef(row.documents)));

    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllFlashcardSets = async (req, res, next) => {
  try {
    const { data: flashcardSets, error } = await supabase
      .from('flashcards')
      .select('*, documents:document_id(id, title, filename)')
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (flashcardSets || []).map((row) =>
      mapFlashcardSet(row, formatDocumentRef(row.documents))
    );

    res.status(200).json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (error) {
    next(error);
  }
};

export const reviewFlashcards = async (req, res, next) => {
  try {
    const result = await findFlashcardSetByCardId(req.params.cardId, req.user._id);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Flashcard not found', statusCode: 404 });
    }

    const { set, cardIndex } = result;
    const cards = [...(set.cards || [])];
    cards[cardIndex] = {
      ...cards[cardIndex],
      lastReviewed: new Date().toISOString(),
      reviewCount: (cards[cardIndex].reviewCount || 0) + 1,
    };

    const { data: updated, error } = await supabase
      .from('flashcards')
      .update({ cards })
      .eq('id', set.id)
      .select('*, documents:document_id(id, title, filename)')
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: mapFlashcardSet(updated, formatDocumentRef(updated.documents)),
      message: 'Flashcard reviewed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleStarFlashcard = async (req, res, next) => {
  try {
    const result = await findFlashcardSetByCardId(req.params.cardId, req.user._id);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Flashcard not found', statusCode: 404 });
    }

    const { set, cardIndex } = result;
    const cards = [...(set.cards || [])];
    cards[cardIndex] = {
      ...cards[cardIndex],
      isStarred: !cards[cardIndex].isStarred,
    };

    const { data: updated, error } = await supabase
      .from('flashcards')
      .update({ cards })
      .eq('id', set.id)
      .select('*, documents:document_id(id, title, filename)')
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: mapFlashcardSet(updated, formatDocumentRef(updated.documents)),
      message: 'Flashcard star status toggled successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFlashcardSet = async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Flashcard set not found', statusCode: 404 });
    }

    const { data: flashcardSet, error } = await supabase
      .from('flashcards')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (error) throw error;

    if (!flashcardSet) {
      return res.status(404).json({ success: false, error: 'Flashcard set not found', statusCode: 404 });
    }

    const { error: deleteError } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.status(200).json({
      success: true,
      message: 'Flashcard set deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
