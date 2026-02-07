const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

const AuthService = {
  async register({ email, name, first_name, last_name, full_name, password, role, department, location, phone }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) throw new Error('Email already registered');

    const resolvedFirst = first_name || (name ? name.split(' ')[0] : undefined);
    const resolvedLast = last_name || (name ? name.split(' ').slice(1).join(' ') : undefined);
    const resolvedFull = full_name || name || [resolvedFirst, resolvedLast].filter(Boolean).join(' ').trim();

    if (!resolvedFirst || !resolvedLast || !resolvedFull) {
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
    return user;
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    if (!user || !user.is_active) throw new Error('Invalid credentials');
    if (!user.password_hash) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');
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
};

module.exports = AuthService;
