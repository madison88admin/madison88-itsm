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

  async consumeResetToken({ token, password }) {
    const db = require('../config/database');
    const bcrypt = require('bcryptjs');
    // Find token row
    const result = await db.query('SELECT * FROM password_reset_tokens WHERE token = $1 LIMIT 1', [token]);
    const row = result.rows[0];
    if (!row) {
      const err = new Error('Invalid or expired reset token');
      err.status = 400;
      throw err;
    }
    if (row.used) {
      const err = new Error('This reset token has already been used');
      err.status = 400;
      throw err;
    }
    if (new Date(row.expires_at) < new Date()) {
      const err = new Error('Reset token has expired');
      err.status = 400;
      throw err;
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await db.query('UPDATE users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() WHERE user_id = $2', [passwordHash, row.user_id]);

    // Mark token used
    await db.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [row.id]);

    // Optionally, notify user of password change (non-blocking)
    try {
      const NotificationService = require('./notification.service');
      NotificationService.sendWelcomeNotice({ user: { user_id: row.user_id, email: (await db.query('SELECT email, full_name FROM users WHERE user_id = $1', [row.user_id])).rows[0].email } }).catch(() => null);
    } catch (e) {
      // ignore notification errors
    }

    return { message: 'Password has been reset successfully' };
  },
};

module.exports = AuthService;
