const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const TicketTemplatesModel = require('../models/ticket-templates.model');

const router = express.Router();

const templateSchema = Joi.object({
  name: Joi.string().min(3).max(120).required(),
  title: Joi.string().min(5).max(255).required(),
  description: Joi.string().min(10).required(),
  business_impact: Joi.string().min(10).required(),
  category: Joi.string().valid('Hardware', 'Software', 'Access Request', 'Account Creation', 'Network', 'Other').required(),
  priority: Joi.string().valid('P1', 'P2', 'P3', 'P4').required(),
  is_active: Joi.boolean().default(true),
}).required();

const templateUpdateSchema = Joi.object({
  name: Joi.string().min(3).max(120),
  title: Joi.string().min(5).max(255),
  description: Joi.string().min(10),
  business_impact: Joi.string().min(10),
  category: Joi.string().valid('Hardware', 'Software', 'Access Request', 'Account Creation', 'Network', 'Other'),
  priority: Joi.string().valid('P1', 'P2', 'P3', 'P4'),
  is_active: Joi.boolean(),
}).min(1);

router.get('/', authenticate, async (req, res, next) => {
  try {
    const includeInactive = ['it_manager', 'system_admin'].includes(req.user.role);
    const templates = await TicketTemplatesModel.listTemplates({ includeInactive });
    res.json({ status: 'success', data: { templates } });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const { error, value } = templateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details.map((d) => d.message).join(', ') });
    }
    const template = await TicketTemplatesModel.createTemplate({
      ...value,
      created_by: req.user.user_id,
    });
    res.status(201).json({ status: 'success', data: { template } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const { error, value } = templateUpdateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details.map((d) => d.message).join(', ') });
    }
    const template = await TicketTemplatesModel.updateTemplate(req.params.id, value);
    res.json({ status: 'success', data: { template } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
