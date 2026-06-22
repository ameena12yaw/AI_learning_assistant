import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { mapUser } from '../utils/formatDb.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const matchPassword = async (enteredPassword, hashedPassword) => {
  return bcrypt.compare(enteredPassword, hashedPassword);
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const { data: existing } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Email already in use',
        statusCode: 400,
      });
    }

    const hashedPassword = await hashPassword(password);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
      })
      .select()
      .single();

    if (error) throw error;

    const mapped = mapUser(user);
    const token = generateToken(mapped._id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: mapped._id,
          username: mapped.username,
          email: mapped.email,
          profileImage: mapped.profileImage,
          createdAt: mapped.createdAt,
        },
        token,
      },
      message: 'User registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
        statusCode: 400,
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        statusCode: 401,
      });
    }

    const isMatch = await matchPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        statusCode: 401,
      });
    }

    const mapped = mapUser(user);
    const token = generateToken(mapped._id);

    res.status(200).json({
      success: true,
      user: {
        id: mapped._id,
        username: mapped.username,
        email: mapped.email,
        profileImage: mapped.profileImage,
      },
      token,
      message: 'User logged in successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, profile_image, created_at, updated_at')
      .eq('id', req.user._id)
      .single();

    if (error) throw error;

    const mapped = mapUser(user);

    res.status(200).json({
      success: true,
      data: {
        id: mapped._id,
        username: mapped.username,
        email: mapped.email,
        profileImage: mapped.profileImage,
        createdAt: mapped.createdAt,
        updatedAt: mapped.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { username, email, profileImage } = req.body;
    const updates = {};

    if (username) updates.username = username;
    if (email) updates.email = email.toLowerCase();
    if (profileImage) updates.profile_image = profileImage;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user._id)
      .select('id, username, email, profile_image')
      .single();

    if (error) throw error;

    const mapped = mapUser(user);

    res.status(200).json({
      success: true,
      data: {
        id: mapped._id,
        username: mapped.username,
        email: mapped.email,
        profileImage: mapped.profileImage,
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password',
        statusCode: 400,
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('password')
      .eq('id', req.user._id)
      .single();

    if (error) throw error;

    const isMatch = await matchPassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        statusCode: 401,
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', req.user._id);

    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};
