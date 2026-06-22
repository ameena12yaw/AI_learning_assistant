import supabase from '../config/supabase.js';
import { extractTextFromDocument } from '../utils/documentParser.js';
import { chunkText } from '../utils/textChunker.js';
import { mapDocument, isValidUuid } from '../utils/formatDb.js';
import {
  uploadDocumentFile,
  deleteDocumentFile,
  downloadDocumentFile,
  isSupabaseStoragePath,
  isLocalUploadPath,
  resolveDocumentFileUrl,
  shouldRefreshFileUrl,
  ensureStorageBucket,
} from '../utils/documentStorage.js';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads/documents');

const getMimeType = (filename = '') => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

const isSupabaseStorageKey = (storedFilename = '') =>
  storedFilename.includes('/') && !storedFilename.startsWith('http');

const writeTempFile = async (buffer, filename) => {
  const tempPath = path.join(os.tmpdir(), `doc-${Date.now()}-${path.basename(filename)}`);
  await fs.writeFile(tempPath, buffer);
  return tempPath;
};

const withResolvedFileUrl = async (document) => {
  if (!document) return document;

  const resolvedUrl = resolveDocumentFileUrl(document);
  if (!resolvedUrl) return document;

  if (shouldRefreshFileUrl(document) && resolvedUrl !== document.filepath) {
    await supabase.from('documents').update({ filepath: resolvedUrl }).eq('id', document.id);
    document.filepath = resolvedUrl;
  }

  return document;
};

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded', statusCode: 400 });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required', statusCode: 400 });
    }

    const storage = await ensureStorageBucket();
    if (!storage.ok) {
      return res.status(503).json({
        success: false,
        error: `Online document storage is not ready: ${storage.error}`,
        statusCode: 503,
      });
    }

    const { storagePath, publicUrl } = await uploadDocumentFile(req.user._id, req.file);

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        user_id: req.user._id,
        title,
        filename: req.file.originalname,
        stored_filename: storagePath,
        filepath: publicUrl,
        filesize: req.file.size,
        status: 'processing',
      })
      .select()
      .single();

    if (error) throw error;

    processDocument(document.id, req.file.buffer, req.file.originalname).catch((err) => {
      console.error('Error processing document:', err);
    });

    res.status(201).json({
      success: true,
      data: mapDocument(document),
      message: 'Document uploaded successfully and is being processed',
    });
  } catch (error) {
    next(error);
  }
};

const processDocument = async (documentId, fileBuffer, originalName) => {
  let tempPath;

  try {
    tempPath = await writeTempFile(fileBuffer, originalName);
    const { text } = await extractTextFromDocument(tempPath);
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
  } finally {
    if (tempPath) {
      await fs.unlink(tempPath).catch(() => {});
    }
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

    const mapped = await Promise.all(
      (documents || []).map(async (doc) => {
        const resolved = await withResolvedFileUrl(doc);
        return mapDocument(resolved, {
          flashcardCount: flashcardCounts[doc.id] || 0,
          quizCount: quizCounts[doc.id] || 0,
        });
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

    await withResolvedFileUrl(document);

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

export const streamDocumentFile = async (req, res, next) => {
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

    const filename = document.filename || 'document';
    const contentType = getMimeType(filename);

    if (isSupabaseStorageKey(document.stored_filename)) {
      try {
        const fileBlob = await downloadDocumentFile(document.stored_filename);
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return res.send(buffer);
      } catch {
        return res.status(404).json({
          success: false,
          error: 'File not found in online storage. Delete this document and upload it again.',
          statusCode: 404,
        });
      }
    }

    if (document.stored_filename && isLocalUploadPath(document.filepath)) {
      const legacyPath = path.join(uploadDir, path.basename(document.stored_filename));
      try {
        const buffer = await fs.readFile(legacyPath);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return res.send(buffer);
      } catch {
        return res.status(404).json({
          success: false,
          error: 'This file was saved locally and is no longer available. Re-upload the document.',
          statusCode: 404,
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: 'Document file is not available. Re-upload the document.',
      statusCode: 404,
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

    if (isSupabaseStoragePath(document.filepath) && document.stored_filename) {
      await deleteDocumentFile(document.stored_filename).catch((err) => {
        console.warn('Failed to delete storage object:', err.message);
      });
    } else if (document.stored_filename && isLocalUploadPath(document.filepath)) {
      const legacyPath = path.join(uploadDir, path.basename(document.stored_filename));
      await fs.unlink(legacyPath).catch(() => {});
    }

    const { error: deleteError } = await supabase.from('documents').delete().eq('id', document.id);

    if (deleteError) throw deleteError;

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
