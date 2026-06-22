import path from 'path';
import WordExtractor from 'word-extractor';
import { extractTextFromPDF } from './pdfParser.js';

const wordExtractor = new WordExtractor();

export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function isAllowedDocument(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.mimetype);
}

export async function extractTextFromDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const result = await extractTextFromPDF(filePath);
    return { text: result.text, numPages: result.numPages };
  }

  if (ext === '.doc' || ext === '.docx') {
    const extracted = await wordExtractor.extract(filePath);
    return { text: extracted.getBody() || '', numPages: null };
  }

  throw new Error('Unsupported file type. Only PDF and Word files are allowed.');
}
