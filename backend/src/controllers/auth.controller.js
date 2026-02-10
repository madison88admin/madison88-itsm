const Joi = require('joi');
const AuthService = require('../services/auth.service');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).allow('', null),
  first_name: Joi.string().min(2).allow('', null),
  last_name: Joi.string().min(2).allow('', null),
  full_name: Joi.string().min(2).allow('', null),
  password: Joi.string().min(6).required(),
  role: Joi.string()
    .valid('end_user', 'it_agent', 'it_manager', 'system_admin')
    .default('end_user'),
  department: Joi.string().allow('', null),
  location: Joi.string().valid('Philippines', 'US', 'Indonesia', 'Other').allow('', null),
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

      const { email, name, first_name, last_name, full_name, password, role, department, location, phone } = value;
      const user = await AuthService.register({
        email,
        name,
        first_name,
        last_name,
        full_name,
        password,
        role,
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
};

module.exports = AuthController;
