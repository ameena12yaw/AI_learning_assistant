import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';
import { mapUser, isValidUuid } from '../utils/formatDb.js';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!isValidUuid(decoded.id)) {
        return res.status(401).json({ success: false, error: 'Not authorized, token failed', statusCode: 401 });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email, profile_image, created_at, updated_at')
        .eq('id', decoded.id)
        .maybeSingle();

      if (error) throw error;

      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found', statusCode: 401 });
      }

      req.user = mapUser(user);
      delete req.user.password;
      return next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired', statusCode: 401 });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, error: 'Not authorized, token failed', statusCode: 401 });
      }
      return res.status(401).json({ success: false, error: 'Not authorized, token failed', statusCode: 401 });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token', statusCode: 401 });
  }
};

export default protect;
