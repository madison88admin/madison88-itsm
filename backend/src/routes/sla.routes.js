const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const SlaModel = require('../models/sla.model');

const router = express.Router();

const prioritySchema = Joi.string().valid('P1', 'P2', 'P3', 'P4').required();

const ruleSchema = Joi.object({
  response_time_hours: Joi.number().integer().min(1).required(),
  resolution_time_hours: Joi.number().integer().min(1).required(),
  escalation_threshold_percent: Joi.number().integer().min(1).max(100).default(80),
  is_active: Joi.boolean().default(true),
});

const rulePatchSchema = Joi.object({
  response_time_hours: Joi.number().integer().min(1),
  resolution_time_hours: Joi.number().integer().min(1),
  escalation_threshold_percent: Joi.number().integer().min(1).max(100),
  is_active: Joi.boolean(),
}).min(1);

// List SLA rules (admin only)
router.get('/', authenticate, authorize(['system_admin']), async (req, res, next) => {
  try {
    const rules = await SlaModel.listRules();
    res.json({ status: 'success', data: { rules } });
  } catch (err) {
    next(err);
  }
});

// Create or replace SLA rule by priority (admin only)
router.put('/:priority', authenticate, authorize(['system_admin']), async (req, res, next) => {
  try {
    const { error: paramError } = prioritySchema.validate(req.params.priority);
    if (paramError) throw new Error('Invalid priority');

    const { error, value } = ruleSchema.validate(req.body, { abortEarly: false });
    if (error) throw new Error(error.details.map((d) => d.message).join(', '));

    const rule = await SlaModel.upsertRule({ priority: req.params.priority, ...value });
    res.json({ status: 'success', data: { rule } });
  } catch (err) {
    next(err);
  }
});

// Update SLA rule by priority (admin only)
router.patch('/:priority', authenticate, authorize(['system_admin']), async (req, res, next) => {
  try {
    const { error: paramError } = prioritySchema.validate(req.params.priority);
    if (paramError) throw new Error('Invalid priority');

    const { error, value } = rulePatchSchema.validate(req.body, { abortEarly: false });
    if (error) throw new Error(error.details.map((d) => d.message).join(', '));

    const rule = await SlaModel.updateRule(req.params.priority, value);
    if (!rule) return res.status(404).json({ status: 'error', message: 'SLA rule not found' });

    res.json({ status: 'success', data: { rule } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
