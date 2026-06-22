import multer from 'multer';
import { isAllowedDocument } from '../utils/documentParser.js';

const fileFilter = (req, file, cb) => {
  if (isAllowedDocument(file)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word (.doc, .docx) files are allowed'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024 },
});

export default upload;
