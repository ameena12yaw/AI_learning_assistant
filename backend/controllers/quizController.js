import supabase from '../config/supabase.js';
import { mapQuiz, isValidUuid } from '../utils/formatDb.js';

const formatDocumentRef = (doc) => {
  if (!doc) return null;
  if (typeof doc === 'string') return doc;
  return { _id: doc.id, title: doc.title, filename: doc.filename };
};

export const getQuizzes = async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.documentId)) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*, documents:document_id(id, title, filename)')
      .eq('user_id', req.user._id)
      .eq('document_id', req.params.documentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (quizzes || []).map((row) =>
      mapQuiz(row, formatDocumentRef(row.documents))
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

export const getQuizById = async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
    }

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (error) throw error;

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
    }

    res.status(200).json({
      success: true,
      data: mapQuiz(quiz),
    });
  } catch (error) {
    next(error);
  }
};

export const submitQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, error: 'Answers must be an array', statusCode: 400 });
    }

    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
    }

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (error) throw error;

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
    }

    if (quiz.completed_at) {
      return res.status(400).json({ success: false, error: 'Quiz already submitted', statusCode: 400 });
    }

    const questions = quiz.questions || [];
    let correctCount = 0;
    const userAnswers = [];

    answers.forEach((ans) => {
      const { questionIndex, selectedAnswer } = ans;
      if (questionIndex < questions.length) {
        const question = questions[questionIndex];
        const isCorrect = question.correctAnswer === selectedAnswer;
        if (isCorrect) correctCount++;
        userAnswers.push({
          questionIndex,
          selectedAnswer,
          isCorrect,
          answereAt: new Date().toISOString(),
        });
      }
    });

    const score = Math.round((correctCount / quiz.total_questions) * 100);

    const { data: updated, error: updateError } = await supabase
      .from('quizzes')
      .update({
        user_answers: userAnswers,
        score,
        completed_at: new Date().toISOString(),
      })
      .eq('id', quiz.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      data: {
        quizId: updated.id,
        score,
        correctCount,
        totalQuestions: updated.total_questions,
        percentage: score,
        userAnswers,
      },
      message: 'Quiz submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getQuizResults = async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
    }

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*, documents:document_id(id, title)')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (error) throw error;

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
    }

    if (!quiz.completed_at) {
      return res.status(400).json({ success: false, error: 'Quiz not yet submitted', statusCode: 400 });
    }

    const mapped = mapQuiz(quiz);
    const detailedResults = mapped.questions.map((question, index) => {
      const userAnswer = mapped.userAnswer.find((ans) => ans.questionIndex === index);
      return {
        questionIndex: index,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        selectedAnswer: userAnswer ? userAnswer.selectedAnswer : null,
        isCorrect: userAnswer ? userAnswer.isCorrect : false,
        explanation: question.explaination,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: mapped._id,
          title: mapped.title,
          document: formatDocumentRef(quiz.documents),
          score: mapped.score,
          totalQuestions: mapped.totalQuestions,
          completedAt: mapped.completedAt,
        },
        results: detailedResults,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuiz = async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
    }

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (error) throw error;

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found', statusCode: 404 });
    }

    const { error: deleteError } = await supabase.from('quizzes').delete().eq('id', req.params.id);
    if (deleteError) throw deleteError;

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
