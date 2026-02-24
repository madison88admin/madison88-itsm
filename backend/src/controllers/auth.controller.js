const Joi = require('joi');
const AuthService = require('../services/auth.service');
const UserActivityService = require('../services/user-activity.service');
const jwt = require('jsonwebtoken');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).allow('', null),
  first_name: Joi.string().min(2).allow('', null),
  last_name: Joi.string().min(2).allow('', null),
  full_name: Joi.string().min(2).allow('', null),
  password: Joi.string().min(6).required(),
  department: Joi.string().allow('', null),
  location: Joi.string().valid('Philippines', 'US', 'Indonesia', 'China', 'Other').allow('', null),
  phone: Joi.string().allow('', null),
}).required();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
}).required();


const AuthController = {
  async register(req, res, next) {
    try {
      const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.details.map((detail) => detail.message).join(', '),
        });
      }

      const hasName =
        value.full_name ||
        value.name ||
        (value.first_name && value.last_name);
      if (!hasName) {
        return res.status(400).json({
          status: 'error',
          message: 'Name is required',
        });
      }

      const { email, name, first_name, last_name, full_name, password, department, location, phone } = value;
      const user = await AuthService.register({
        email,
        name,
        first_name,
        last_name,
        full_name,
        password,
        role: 'end_user',
        department,
        location,
        phone,
      });
      res.status(201).json({ status: 'success', user });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.details.map((detail) => detail.message).join(', '),
        });
      }
      const { email, password } = value;
      const { token, user } = await AuthService.login({ email, password });
      
      // Log user login activity
      const ipAddress = req.ip || req.connection.remoteAddress || 'UNKNOWN';
      const userAgent = req.headers['user-agent'] || 'UNKNOWN';
      const location = req.body.location || user.location || null;
      
      try {
        await UserActivityService.logLogin(user.user_id, ipAddress, userAgent, location);
      } catch (logErr) {
        // Don't fail login if activity logging fails
        console.error('Failed to log login activity:', logErr);
      }
      
      res.json({ status: 'success', token, user });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      res.json({ status: 'success', user: req.user });
    } catch (err) {
      next(err);
    }
  },


  async logout(req, res, next) {
    try {
      // Log user logout activity
      const userId = req.user?.user_id;
      if (userId) {
        try {
          await UserActivityService.logLogout(userId);
        } catch (logErr) {
          // Don't fail logout if activity logging fails
          console.error('Failed to log logout activity:', logErr);
        }
      }
      
      res.json({
        status: 'success',
        message: 'Logout successful'
      });
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({
          status: 'error',
          message: 'Refresh token is required'
        });
      }

      const result = await AuthService.refreshToken(refreshToken);
      res.json({
        status: 'success',
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

    async resetPassword(req, res, next) {
      try {
        const schema = Joi.object({
          token: Joi.string().required(),
          password: Joi.string().min(6).required(),
        });

        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
          return res.status(400).json({ status: 'error', message: error.details.map(d => d.message).join(', ') });
        }

        const { token, password } = value;
        const result = await AuthService.consumeResetToken({ token, password });
        res.json({ status: 'success', data: result });
      } catch (err) {
        next(err);
      }
    },

    async requestReset(req, res, next) {
      try {
        const schema = Joi.object({ email: Joi.string().email().required() });
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
          return res.status(400).json({ status: 'error', message: error.details.map(d => d.message).join(', ') });
        }

        const { email } = value;
        // Non-enumeration response: always return success message
        const UserModel = require('../models/user.model');
        const NotificationService = require('../services/notification.service');
        const db = require('../config/database');
        const crypto = require('crypto');

        const user = await UserModel.findByEmail(email);
        if (user) {
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          try {
            await db.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.user_id, token, expiresAt]);
          } catch (err) {
            console.error('Failed to store password reset token:', err);
          }

          NotificationService.sendPasswordResetNotice({ user, token }).catch(err => {
            console.error('Failed to send password reset notice:', err);
          });
        }

        return res.json({ status: 'success', message: 'If an account exists for this email, a password reset link has been sent.' });
      } catch (err) {
        next(err);
      }
    },
};

module.exports = AuthController;
