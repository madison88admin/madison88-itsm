const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ChangeModel = require('../models/change.model');

const router = express.Router();

const createSchema = Joi.object({
  title: Joi.string().min(5).max(255).required(),
  description: Joi.string().min(10).required(),
  change_type: Joi.string().valid('standard', 'normal', 'emergency').required(),
  affected_systems: Joi.string().allow('', null),
  implementation_plan: Joi.string().allow('', null),
  rollback_plan: Joi.string().allow('', null),
  risk_assessment: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  change_window_start: Joi.date().allow(null),
  change_window_end: Joi.date().allow(null),
  ticket_id: Joi.string().uuid().allow(null, ''),
}).required();

const updateSchema = Joi.object({
  title: Joi.string().min(5).max(255),
  description: Joi.string().min(10),
  change_type: Joi.string().valid('standard', 'normal', 'emergency'),
  affected_systems: Joi.string().allow('', null),
  implementation_plan: Joi.string().allow('', null),
  rollback_plan: Joi.string().allow('', null),
  risk_assessment: Joi.string().valid('low', 'medium', 'high', 'critical'),
  change_window_start: Joi.date().allow(null),
  change_window_end: Joi.date().allow(null),
  status: Joi.string().valid('new', 'submitted', 'approved', 'scheduled', 'implemented', 'closed', 'rejected'),
}).min(1);

function canManage(user) {
  return ['it_manager', 'system_admin'].includes(user.role);
}

async function generateChangeNumber() {
  const year = new Date().getFullYear();
  const latest = await ChangeModel.getLatestChangeNumber(year);
  const next = latest ? parseInt(latest.split('-').pop(), 10) + 1 : 1;
  return `CHG-${year}-${String(next).padStart(4, '0')}`;
}

router.get('/', authenticate, authorize(['it_manager', 'system_admin', 'it_agent']), async (req, res, next) => {
  try {
    const { status, from, to } = req.query;
    const changes = await ChangeModel.listChanges({ status, from, to });
    res.json({ status: 'success', data: { changes } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, authorize(['it_manager', 'system_admin', 'it_agent']), async (req, res, next) => {
  try {
    const change = await ChangeModel.getChangeById(req.params.id);
    if (!change) return res.status(404).json({ status: 'error', message: 'Change not found' });
    res.json({ status: 'success', data: { change } });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize(['it_manager', 'system_admin', 'it_agent']), async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details.map((d) => d.message).join(', ') });
    }

    const change_number = await generateChangeNumber();
    const change = await ChangeModel.createChange({
      change_number,
      ticket_id: value.ticket_id || null,
      title: value.title,
      description: value.description,
      change_type: value.change_type,
      affected_systems: value.affected_systems || null,
      implementation_plan: value.implementation_plan || null,
      rollback_plan: value.rollback_plan || null,
      risk_assessment: value.risk_assessment,
      change_window_start: value.change_window_start || null,
      change_window_end: value.change_window_end || null,
      requested_by: req.user.user_id,
      status: 'submitted',
    });

    res.status(201).json({ status: 'success', data: { change } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details.map((d) => d.message).join(', ') });
    }

    const existing = await ChangeModel.getChangeById(req.params.id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Change not found' });

    const updates = { ...value };
    if (updates.status === 'approved') updates.approved_at = new Date();
    if (updates.status === 'implemented') updates.implemented_at = new Date();
    if (updates.status === 'closed') updates.closed_at = new Date();

    const change = await ChangeModel.updateChange(req.params.id, updates);
    res.json({ status: 'success', data: { change } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approve', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const schema = Joi.object({
      status: Joi.string().valid('approved', 'rejected').required(),
      comment: Joi.string().allow('', null),
    });
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details.map((d) => d.message).join(', ') });
    }

    const existing = await ChangeModel.getChangeById(req.params.id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Change not found' });

    await ChangeModel.upsertApprover(req.params.id, req.user.user_id, value.status, value.comment);

    const approvers = await ChangeModel.listApprovers(req.params.id);
    const hasRejected = approvers.some((a) => a.approval_status === 'rejected');
    const allApproved = approvers.length > 0 && approvers.every((a) => a.approval_status === 'approved');

    let nextStatus = existing.status;
    if (hasRejected) nextStatus = 'rejected';
    if (allApproved) nextStatus = 'approved';

    if (nextStatus !== existing.status) {
      await ChangeModel.updateChange(req.params.id, {
        status: nextStatus,
        approved_at: nextStatus === 'approved' ? new Date() : null,
      });
    }

    res.json({ status: 'success', data: { status: nextStatus } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/approvers', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const approvers = await ChangeModel.listApprovers(req.params.id);
    res.json({ status: 'success', data: { approvers } });
  } catch (err) {
    next(err);
  }
});

router.get('/calendar/upcoming', authenticate, authorize(['it_manager', 'system_admin', 'it_agent']), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const changes = await ChangeModel.listChanges({ status: 'scheduled', from, to });
    res.json({ status: 'success', data: { changes } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
