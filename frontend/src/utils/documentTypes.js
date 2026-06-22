export const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const isPdfFile = (filename = '') => /\.pdf$/i.test(filename);

export const isWordFile = (filename = '') => /\.(doc|docx)$/i.test(filename);

export const isAllowedUploadFile = (file) => {
  if (!file) return false;
  const name = file.name?.toLowerCase() || '';
  return isPdfFile(name) || isWordFile(name);
};
