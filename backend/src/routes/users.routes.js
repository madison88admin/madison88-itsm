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
router.patch('/:id', authenticate, authorize(['system_admin']), async (req, res) => {
  const schema = Joi.object({
    role: Joi.string().valid('end_user', 'it_agent', 'it_manager', 'system_admin'),
    department: Joi.string().allow('', null),
    location: Joi.string().valid('Philippines', 'US', 'Indonesia', 'Other').allow('', null),
    phone: Joi.string().allow('', null),
    is_active: Joi.boolean(),
  }).min(1);

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ status: 'error', message: error.details.map((d) => d.message).join(', ') });

  const user = await UserModel.updateUser(req.params.id, value);
  res.json({ status: 'success', data: { user } });
});

module.exports = router;
