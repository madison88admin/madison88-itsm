const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const NotificationService = require('./notification.service');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

const AuthService = {
  async register({ email, name, first_name, last_name, full_name, password, role, department, location, phone }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) throw new Error('Email already registered');

    const sourceName = name || full_name || '';
    const nameParts = sourceName.trim().split(/\s+/);

    const resolvedFirst = first_name || nameParts[0];
    const resolvedLast = last_name || nameParts.slice(1).join(' ');
    const resolvedFull = full_name || name || [resolvedFirst, resolvedLast].filter(Boolean).join(' ').trim();

    if (!resolvedFirst || !resolvedFull) {
      throw new Error('Name is required');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      email,
      first_name: resolvedFirst,
      last_name: resolvedLast,
      full_name: resolvedFull,
      passwordHash,
      role,
      department,
      location,
      phone,
    });

    // Send Welcome Email (Non-blocking)
    NotificationService.sendWelcomeNotice({ user }).catch(err => {
      console.error('Failed to send welcome notice:', err);
    });

    return user;
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    if (!user) throw new Error('Invalid email or password');
    if (!user.is_active) throw new Error('Account is inactive. Please contact your administrator.');
    if (!user.password_hash) throw new Error('Invalid email or password');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Invalid email or password');
    await UserModel.updateLastLogin(user.user_id);
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return { token, user };
  },

  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  },


  async refreshToken(refreshToken) {
    // TODO: Implement actual refresh token verification logic
    // For now, we'll just return a mock token if a refresh token is provided
    if (!refreshToken) throw new Error('Refresh token is required');

    // In a real implementation:
    // 1. Verify refreshToken (check signature, expiration, database whitelist)
    // 2. Get user from refreshToken
    // 3. Generate new access token

    return { token: 'new_jwt_token' };
  },
};

module.exports = AuthService;
