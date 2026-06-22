import supabase from '../config/supabase.js';
import { extractTextFromDocument } from '../utils/documentParser.js';
import { chunkText } from '../utils/textChunker.js';
import { mapDocument, isValidUuid } from '../utils/formatDb.js';

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads/documents');

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded', statusCode: 400 });
    }

    const { title } = req.body;
    if (!title) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ success: false, error: 'Title is required', statusCode: 400 });
    }

    const baseUrl = `http://localhost:${process.env.PORT || 8000}`;
    const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        user_id: req.user._id,
        title,
        filename: req.file.originalname,
        stored_filename: req.file.filename,
        filepath: fileUrl,
        filesize: req.file.size,
        status: 'processing',
      })
      .select()
      .single();

    if (error) throw error;

    processDocument(document.id, req.file.path).catch((err) => {
      console.error('Error processing document:', err);
    });

    res.status(201).json({
      success: true,
      data: mapDocument(document),
      message: 'Document uploaded successfully and is being processed',
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

const processDocument = async (documentId, filePath) => {
  try {
    const { text } = await extractTextFromDocument(filePath);
    const chunks = chunkText(text, 50, 5);

    const { error } = await supabase
      .from('documents')
      .update({
        extracted_text: text,
        chunks,
        status: 'ready',
      })
      .eq('id', documentId);

    if (error) throw error;
    console.log(`Document ${documentId} processed successfully.`);
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    await supabase.from('documents').update({ status: 'failed' }).eq('id', documentId);
  }
};

export const getDocuments = async (req, res, next) => {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, user_id, title, filename, filepath, filesize, upload_date, last_accessed, status, created_at, updated_at')
      .eq('user_id', req.user._id)
      .order('upload_date', { ascending: false });

    if (error) throw error;

    const { data: flashcardSets } = await supabase
      .from('flashcards')
      .select('document_id')
      .eq('user_id', req.user._id);

    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('document_id')
      .eq('user_id', req.user._id);

    const flashcardCounts = {};
    const quizCounts = {};

    (flashcardSets || []).forEach((f) => {
      flashcardCounts[f.document_id] = (flashcardCounts[f.document_id] || 0) + 1;
    });

    (quizzes || []).forEach((q) => {
      quizCounts[q.document_id] = (quizCounts[q.document_id] || 0) + 1;
    });

    const mapped = (documents || []).map((doc) =>
      mapDocument(doc, {
        flashcardCount: flashcardCounts[doc.id] || 0,
        quizCount: quizCounts[doc.id] || 0,
      })
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

export const getDocument = async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Document not found', statusCode: 404 });
    }

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (error) throw error;

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found', statusCode: 404 });
    }

    const { count: flashcardCount } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', document.id)
      .eq('user_id', req.user._id);

    const { count: quizCount } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', document.id)
      .eq('user_id', req.user._id);

    await supabase
      .from('documents')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', document.id);

    res.status(200).json({
      success: true,
      data: mapDocument(document, { flashcardCount: flashcardCount || 0, quizCount: quizCount || 0 }),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Document not found', statusCode: 404 });
    }

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (error) throw error;

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found', statusCode: 404 });
    }

    if (document.stored_filename) {
      const filePath = path.join(uploadDir, document.stored_filename);
      await fs.unlink(filePath).catch(() => {});
    }

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', document.id);

    if (deleteError) throw deleteError;

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
