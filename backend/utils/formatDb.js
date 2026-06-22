import { randomUUID } from 'crypto';

const SNAKE_TO_CAMEL = {
  user_id: 'userId',
  document_id: 'documentId',
  profile_image: 'profileImage',
  extracted_text: 'extractedText',
  upload_date: 'uploadDate',
  last_accessed: 'lastAccessed',
  stored_filename: 'storedFilename',
  user_answers: 'userAnswer',
  total_questions: 'totalQuestions',
  completed_at: 'completedAt',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

export function toApiId(row) {
  if (!row) return null;
  const { id, ...rest } = row;
  return { _id: id, ...rest };
}

export function mapRow(row) {
  if (!row) return null;

  const result = { _id: row.id };

  for (const [key, value] of Object.entries(row)) {
    if (key === 'id') continue;
    const mappedKey = SNAKE_TO_CAMEL[key] || key;
    result[mappedKey] = value;
  }

  return result;
}

export function mapRows(rows) {
  return (rows || []).map(mapRow);
}

export function withNestedIds(items = []) {
  return items.map((item) => ({
    _id: item._id || randomUUID(),
    ...item,
  }));
}

export function mapUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    profileImage: row.profile_image,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDocument(row, extras = {}) {
  if (!row) return null;
  return {
    _id: row.id,
    userId: row.user_id,
    title: row.title,
    filename: row.filename,
    filepath: row.filepath,
    filesize: row.filesize,
    extractedText: row.extracted_text,
    chunks: row.chunks || [],
    uploadDate: row.upload_date,
    lastAccessed: row.last_accessed,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extras,
  };
}

export function normalizeDocumentRef(document, documentId = null) {
  if (document && typeof document === 'object') {
    const id = document._id || document.id;
    if (id) {
      return {
        _id: id,
        title: document.title || 'Untitled document',
        filename: document.filename || '',
      };
    }
  }

  if (typeof documentId === 'string') {
    return { _id: documentId, title: 'Untitled document', filename: '' };
  }

  if (typeof document === 'string') {
    return { _id: document, title: 'Untitled document', filename: '' };
  }

  return null;
}

export function mapFlashcardSet(row, document = null) {
  if (!row) return null;

  return {
    _id: row.id,
    userId: row.user_id,
    documentId: normalizeDocumentRef(document, row.document_id),
    cards: (row.cards || []).map((card) => ({
      _id: card._id,
      question: card.question,
      answer: card.answer,
      difficulty: card.difficulty,
      lastReviewed: card.lastReviewed ?? null,
      reviewCount: card.reviewCount ?? 0,
      isStarred: card.isStarred ?? false,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQuiz(row, document = null) {
  if (!row) return null;
  return {
    _id: row.id,
    userId: row.user_id,
    documentId: document || row.document_id,
    title: row.title,
    questions: (row.questions || []).map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explaination: q.explaination ?? q.explanation ?? '',
      diffuculty: q.diffuculty ?? q.difficulty ?? 'medium',
    })),
    userAnswer: row.user_answers || [],
    score: row.score ?? 0,
    totalQuestions: row.total_questions,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapChatHistory(row) {
  if (!row) return null;
  return {
    _id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    messages: row.messages || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
