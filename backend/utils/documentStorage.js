import supabase from '../config/supabase.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'documents';

export const buildStoragePath = (userId, originalName) => {
  const safeName = (originalName || 'file').replace(/[^\w.\-() ]+/g, '_');
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
  return `${userId}/${uniqueName}`;
};

export const uploadDocumentFile = async (userId, file) => {
  const storagePath = buildStoragePath(userId, file.originalname);

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file.buffer, {
    contentType: file.mimetype || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Failed to upload file to storage');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: data.publicUrl,
  };
};

export const deleteDocumentFile = async (storagePath) => {
  if (!storagePath) return;

  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    throw new Error(error.message || 'Failed to delete file from storage');
  }
};

export const isSupabaseStoragePath = (filepath = '') =>
  filepath.includes('supabase.co/storage/v1/object/public/');

export const isLocalUploadPath = (filepath = '') =>
  filepath.includes('localhost') || filepath.includes('/uploads/documents/');
