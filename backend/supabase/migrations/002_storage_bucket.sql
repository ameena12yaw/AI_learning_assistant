-- Run in Supabase SQL Editor after schema.sql
-- Creates a public bucket for uploaded PDFs and Word documents

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public read access to uploaded documents
DROP POLICY IF EXISTS "Public read access for documents bucket" ON storage.objects;
CREATE POLICY "Public read access for documents bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Backend uses service role for uploads/deletes; no extra insert policy required for API uploads
