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
    const cache = req.app.get('cache');
    const cacheKey = `templates:list:${req.user.role}`;

    // Try to get from cache
    let templates = await cache.get(cacheKey);
    if (templates) {
      return res.json({ status: 'success', data: { templates }, cached: true });
    }

    // Fetch from database
    const includeInactive = ['it_manager', 'system_admin'].includes(req.user.role);
    templates = await TicketTemplatesModel.listTemplates({ includeInactive });

    // Cache for 5 minutes (300 seconds)
    await cache.set(cacheKey, templates, 300);

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

    // Invalidate cache
    const cache = req.app.get('cache');
    await cache.clear('templates:list:*');

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
    const existing = await TicketTemplatesModel.getTemplateById(req.params.id);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Template not found' });
    }
    const template = await TicketTemplatesModel.updateTemplate(req.params.id, value);
    if (!template) {
      return res.status(404).json({ status: 'error', message: 'Template not found' });
    }

    // Invalidate cache
    const cache = req.app.get('cache');
    await cache.clear('templates:list:*');

    res.json({ status: 'success', data: { template } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const existing = await TicketTemplatesModel.getTemplateById(req.params.id);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Template not found' });
    }
    await TicketTemplatesModel.deleteTemplate(req.params.id);

    // Invalidate cache
    const cache = req.app.get('cache');
    await cache.clear('templates:list:*');

    res.json({ status: 'success', message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
