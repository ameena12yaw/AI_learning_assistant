import supabase from '../config/supabase.js';
import * as llmService from '../utils/llmService.js';
import { findRelevantChunks } from '../utils/textChunker.js';
import { mapDocument, mapFlashcardSet, mapQuiz, withNestedIds, isValidUuid } from '../utils/formatDb.js';

const normalizeChunks = (chunks) => {
  if (!chunks) return [];
  if (typeof chunks === 'string') {
    try {
      const parsed = JSON.parse(chunks);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(chunks) ? chunks : [];
};

const getReadyDocument = async (documentId, userId) => {
  if (!isValidUuid(documentId)) return null;

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .eq('status', 'ready')
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const generateFlashcards = async (req, res, next) => {
  try {
    const { documentId, count = 10 } = req.body;

    if (!documentId) {
      return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
    }

    const document = await getReadyDocument(documentId, req.user._id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
    }

    const cards = await llmService.generateFlashcards(document.extracted_text, parseInt(count));

    const cardsWithIds = withNestedIds(
      cards.map((card) => ({
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
        reviewCount: 0,
        isStarred: false,
      }))
    );

    const { data: flashcardSet, error } = await supabase
      .from('flashcards')
      .insert({
        user_id: req.user._id,
        document_id: document.id,
        cards: cardsWithIds,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: mapFlashcardSet(flashcardSet, document.id),
      message: 'Flashcards generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const generateQuiz = async (req, res, next) => {
  try {
    const { documentId, numQuestions = 5, title } = req.body;

    if (!documentId) {
      return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
    }

    const count = parseInt(numQuestions, 10);
    if (!count || count < 1 || count > 50) {
      return res.status(400).json({
        success: false,
        error: 'Number of questions must be between 1 and 50',
        statusCode: 400,
      });
    }

    const document = await getReadyDocument(documentId, req.user._id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
    }

    if (!document.extracted_text?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No text could be extracted from this document. Re-upload or try a different file.',
        statusCode: 400,
      });
    }

    const questions = await llmService.generateQuiz(document.extracted_text, count);
    const questionsWithIds = withNestedIds(questions);

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        user_id: req.user._id,
        document_id: document.id,
        title: title || `Quiz for ${document.title}`,
        questions: questionsWithIds,
        total_questions: questionsWithIds.length,
        user_answers: [],
        score: 0,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: mapQuiz(quiz),
      message:
        questionsWithIds.length < count
          ? `Quiz generated with ${questionsWithIds.length} of ${count} requested questions`
          : 'Quiz generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const generateSummary = async (req, res, next) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
    }

    const document = await getReadyDocument(documentId, req.user._id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
    }

    if (!document.extracted_text?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No text could be extracted from this document. Re-upload or try a different file.',
        statusCode: 400,
      });
    }

    const summary = await llmService.generateSummary(document.extracted_text);

    res.status(200).json({
      success: true,
      data: {
        documentId: document.id,
        title: document.title,
        summary,
      },
      message: 'Summary generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const chat = async (req, res, next) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({ success: false, error: 'Document ID and question are required', statusCode: 400 });
    }

    const document = await getReadyDocument(documentId, req.user._id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
    }

    const chunks = findRelevantChunks(normalizeChunks(document.chunks), question, 5);
    const chunkIndices = chunks.map((c) => c.chunkIndex);

    let { data: chatHistory, error: fetchError } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', req.user._id)
      .eq('document_id', document.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!chatHistory) {
      const { data: created, error: createError } = await supabase
        .from('chat_history')
        .insert({
          user_id: req.user._id,
          document_id: document.id,
          messages: [],
        })
        .select()
        .single();

      if (createError) throw createError;
      chatHistory = created;
    }

    const answer = await llmService.chatWithContext(question, chunks);

    const messages = [
      ...(chatHistory.messages || []),
      {
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
        relevantChunks: [],
      },
      {
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
        relevantChunks: chunkIndices,
      },
    ];

    const { data: updated, error: updateError } = await supabase
      .from('chat_history')
      .update({ messages })
      .eq('id', chatHistory.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      data: {
        question,
        answer,
        relevantChunks: chunkIndices,
        chatHistoryId: updated.id,
      },
      message: 'Chat response generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const explainConcept = async (req, res, next) => {
  try {
    const { documentId, concept } = req.body;

    if (!documentId || !concept?.trim()) {
      return res.status(400).json({ success: false, error: 'Document ID and concept are required', statusCode: 400 });
    }

    const document = await getReadyDocument(documentId, req.user._id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found or not ready', statusCode: 404 });
    }

    if (!document.extracted_text?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No text could be extracted from this document. Re-upload or try a different file.',
        statusCode: 400,
      });
    }

    const chunks = findRelevantChunks(normalizeChunks(document.chunks), concept.trim(), 5);
    let context = chunks.map((c) => c.content).filter(Boolean).join('\n\n');

    if (!context.trim()) {
      context = document.extracted_text.substring(0, 12000);
    }

    const explanation = await llmService.explainConcept(concept.trim(), context);

    res.status(200).json({
      success: true,
      data: {
        concept: concept.trim(),
        explanation,
        relevantChunks: chunks.map((c) => c.chunkIndex),
      },
      message: 'Concept explanation generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({ success: false, error: 'Document ID is required', statusCode: 400 });
    }

    const { data: chatHistory, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', req.user._id)
      .eq('document_id', documentId)
      .maybeSingle();

    if (error) throw error;

    if (!chatHistory) {
      return res.status(404).json({ success: false, error: 'Chat history not found', statusCode: 404 });
    }

    res.status(200).json({
      success: true,
      data: chatHistory.messages || [],
      message: 'Chat history retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};
