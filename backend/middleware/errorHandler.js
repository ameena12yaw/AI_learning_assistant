const errorHandler = (err, req, res, next) => {
  let statustCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Postgres duplicate key
  if (err.code === '23505') {
    const field = err.details?.includes('email') ? 'email' : 'username';
    message = `Duplicate field value entered for ${field}`;
    statustCode = 400;
  }

  // Postgres invalid UUID
  if (err.code === '22P02') {
    message = 'Invalid resource ID';
    statustCode = 400;
  }

  // Supabase not found
  if (err.code === 'PGRST116') {
    message = 'Resource not found';
    statustCode = 404;
  }

  // multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    message = 'File size is too large. Max limit is 10MB';
    statustCode = 400;
  }

  // jwt error
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again';
    statustCode = 401;
  }

  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statustCode).json({
    success: false,
    error: message,
    statusCode: statustCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
