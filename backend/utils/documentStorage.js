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

export const getPublicFileUrl = (storagePath) => {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
};

export const resolveDocumentFileUrl = (document) => {
  if (!document) return null;

  const storagePath = document.stored_filename;
  const filepath = document.filepath || '';

  if (storagePath && storagePath.includes('/') && !storagePath.startsWith('http')) {
    return getPublicFileUrl(storagePath);
  }

  if (isSupabaseStoragePath(filepath)) {
    return filepath;
  }

  return filepath || null;
};

export const shouldRefreshFileUrl = (document) => {
  if (!document?.stored_filename) return false;

  const storagePath = document.stored_filename;
  const filepath = document.filepath || '';

  if (storagePath.includes('/') && !storagePath.startsWith('http')) {
    return !isSupabaseStoragePath(filepath);
  }

  return false;
};

export const isLocalUploadPath = (filepath = '') =>
  filepath.includes('localhost') || filepath.includes('/uploads/documents/');

export const getStorageBucketName = () => BUCKET;

const BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: 10485760,
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export const verifyStorageBucket = async () => {
  const { data, error } = await supabase.storage.getBucket(BUCKET);

  if (error || !data) {
    return {
      ok: false,
      bucket: BUCKET,
      error: error?.message || 'Storage bucket not found',
    };
  }

  return {
    ok: true,
    bucket: BUCKET,
    public: data.public,
  };
};

export const ensureStorageBucket = async () => {
  const existing = await verifyStorageBucket();
  if (existing.ok) return existing;

  const { error } = await supabase.storage.createBucket(BUCKET, BUCKET_OPTIONS);

  if (error && !/already exists/i.test(error.message)) {
    return {
      ok: false,
      bucket: BUCKET,
      error: error.message,
    };
  }

  return verifyStorageBucket();
};

export const downloadDocumentFile = async (storagePath) => {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);

  if (error) {
    throw new Error(error.message || 'File not found in storage');
  }

  return data;
};
