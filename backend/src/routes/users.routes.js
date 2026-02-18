const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const UserModel = require('../models/user.model');
const AuthService = require('../services/auth.service');

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  res.json({ status: 'success', user: req.user });
});

// List users (admin or manager)
router.get('/', authenticate, authorize(['system_admin', 'it_manager']), async (req, res) => {
  const role = req.query.role || null;
  const users = await UserModel.listUsers({ role });
  res.json({ status: 'success', data: { users } });
});

// Create user (admin only)
router.post('/', authenticate, authorize(['system_admin']), async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      full_name: Joi.string().required(),
      password: Joi.string().min(6).required(),
      role: Joi.string().valid('end_user', 'it_agent', 'it_manager', 'system_admin').required(),
      department: Joi.string().allow('', null),
      location: Joi.string().valid('Philippines', 'US', 'Indonesia', 'Other').allow('', null),
      phone: Joi.string().allow('', null),
    });
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) throw new Error(error.details.map((d) => d.message).join(', '));

    const user = await AuthService.register(value);
    res.status(201).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
});

// Update user (admin only)
router.patch('/:id', authenticate, authorize(['system_admin']), async (req, res, next) => {
  try {
    const schema = Joi.object({
      role: Joi.string().valid('end_user', 'it_agent', 'it_manager', 'system_admin'),
      department: Joi.string().allow('', null),
      location: Joi.string().valid('Philippines', 'US', 'Indonesia', 'Other').allow('', null),
      phone: Joi.string().allow('', null),
      is_active: Joi.boolean(),
      password: Joi.string().min(6).allow('', null), // Optional password for role changes
    }).min(1);

    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ status: 'error', message: error.details.map((d) => d.message).join(', ') });

    // Get current user to check if role is changing to privileged
    const currentUser = await UserModel.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const isChangingToPrivilegedRole = value.role && 
      ['it_agent', 'it_manager', 'system_admin'].includes(value.role) &&
      currentUser.role === 'end_user';

    // If changing to privileged role, ensure user has a valid password
    if (isChangingToPrivilegedRole) {
      if (value.password) {
        // Admin provided a password - use it
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(value.password, 10);
        await UserModel.updatePassword(req.params.id, passwordHash);
        
        // Remove password from updates
        const { password, ...updates } = value;
        const user = await UserModel.updateUser(req.params.id, updates);
        
        return res.json({ 
          status: 'success', 
          data: { user } 
        });
      } else {
        // No password provided - generate temporary password for the user
        // This ensures they can log in with Email/Password after role change
        const bcrypt = require('bcryptjs');
        const crypto = require('crypto');
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
        
        // Update password with temporary one
        await UserModel.updatePassword(req.params.id, tempPasswordHash);
        
        // Remove password from updates (don't include it in response)
        const { password, ...updates } = value;
        const user = await UserModel.updateUser(req.params.id, updates);
        
        return res.json({ 
          status: 'success', 
          data: { 
            user,
            temporary_password: tempPassword,
            message: 'User role changed to privileged role. A temporary password has been generated. Please share this password with the user - they must use Email/Password login and should change their password on first login.'
          } 
        });
      }
    }

    // Normal update (no role change to privileged, or user already has valid password)
    const { password, ...updates } = value;
    const user = await UserModel.updateUser(req.params.id, updates);
    res.json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
});

// Reset password for a user (admin only) - generates temporary password
router.post('/:id/reset-password', authenticate, authorize(['system_admin']), async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Generate temporary password
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
    
    // Update password
    await UserModel.updatePassword(req.params.id, tempPasswordHash);
    
    res.json({
      status: 'success',
      data: {
        user,
        temporary_password: tempPassword,
        message: 'Password reset successful. A temporary password has been generated. Please share this password with the user - they must use Email/Password login and should change their password on first login.'
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
