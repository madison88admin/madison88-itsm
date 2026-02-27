const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ChangeModel = require('../models/change.model');

const router = express.Router();

const STATUS_ORDER = ['new', 'submitted', 'approved', 'scheduled', 'implemented', 'closed'];
const AUTO_APPROVE_MATRIX = {
  low: new Set(['standard']),
};
const APPROVAL_SLA_HOURS = {
  low: 24,
  medium: 12,
  high: 4,
  critical: 1,
};

function normalizeCsv(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function statusRank(status) {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function canAutoApprove(changeType, risk) {
  const allowedTypes = AUTO_APPROVE_MATRIX[risk];
  if (!allowedTypes) return false;
  return allowedTypes.has(changeType);
}

function getApprovalDueAt(riskAssessment) {
  const hours = APPROVAL_SLA_HOURS[riskAssessment] || 12;
  return new Date(Date.now() + (hours * 60 * 60 * 1000));
}

function validateChangePayload(payload, { isCreate }) {
  const errors = [];
  const checklist = payload.technical_checklist || {};
  const roleAssignments = payload.role_assignments || {};
  const hasWindow =
    payload.change_window_start &&
    payload.change_window_end &&
    new Date(payload.change_window_end).getTime() > new Date(payload.change_window_start).getTime();

  const affectedSystems = normalizeCsv(payload.affected_systems);

  if ((isCreate || payload.role_assignments) && (!roleAssignments.owner_user_id || !roleAssignments.implementer_user_id || !roleAssignments.business_owner)) {
    errors.push('Role assignments require owner, implementer, and business owner.');
  }

  if ((isCreate || payload.business_impact) && (!payload.business_impact || payload.business_impact.length < 10)) {
    errors.push('Business impact must be at least 10 characters.');
  }

  if ((isCreate || payload.communication_plan) && (!payload.communication_plan || payload.communication_plan.length < 10)) {
    errors.push('Communication plan must be at least 10 characters.');
  }

  if ((isCreate || payload.technical_checklist) && (!toBool(checklist.test_evidence) || !toBool(checklist.rollback_ready) || !toBool(checklist.monitoring_ready))) {
    errors.push('Technical checklist must include test evidence, rollback readiness, and monitoring readiness.');
  }

  if ((isCreate || payload.change_type) && payload.change_type === 'emergency' && (!payload.emergency_justification || payload.emergency_justification.length < 10)) {
    errors.push('Emergency changes require emergency justification (min 10 chars).');
  }

  if ((isCreate || payload.change_type || payload.risk_assessment) && canAutoApprove(payload.change_type, payload.risk_assessment) && !hasWindow) {
    errors.push('Auto-approved standard low-risk changes require a valid change window.');
  }

  if ((isCreate || payload.affected_systems) && affectedSystems.length === 0) {
    errors.push('Affected systems must include at least one service/system.');
  }

  if (payload.status && statusRank(payload.status) < statusRank('submitted')) {
    errors.push('Invalid status transition target.');
  }

  return errors;
}

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
  business_impact: Joi.string().min(10).max(2000).allow('', null),
  communication_plan: Joi.string().min(10).max(2000).allow('', null),
  dependency_map: Joi.string().max(2000).allow('', null),
  role_assignments: Joi.object({
    requester_user_id: Joi.string().uuid().allow(null),
    implementer_user_id: Joi.string().uuid().required(),
    approver_user_id: Joi.string().uuid().allow(null),
    owner_user_id: Joi.string().uuid().required(),
    business_owner: Joi.string().min(2).max(255).required(),
  }).required(),
  technical_checklist: Joi.object({
    test_evidence: Joi.boolean().required(),
    backup_ready: Joi.boolean().required(),
    rollback_ready: Joi.boolean().required(),
    monitoring_ready: Joi.boolean().required(),
    dependency_mapped: Joi.boolean().required(),
  }).required(),
  emergency_justification: Joi.string().min(10).max(2000).allow('', null),
  retro_due_at: Joi.date().allow(null),
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
  business_impact: Joi.string().min(10).max(2000).allow('', null),
  communication_plan: Joi.string().min(10).max(2000).allow('', null),
  dependency_map: Joi.string().max(2000).allow('', null),
  role_assignments: Joi.object({
    requester_user_id: Joi.string().uuid().allow(null),
    implementer_user_id: Joi.string().uuid().required(),
    approver_user_id: Joi.string().uuid().allow(null),
    owner_user_id: Joi.string().uuid().required(),
    business_owner: Joi.string().min(2).max(255).required(),
  }),
  technical_checklist: Joi.object({
    test_evidence: Joi.boolean().required(),
    backup_ready: Joi.boolean().required(),
    rollback_ready: Joi.boolean().required(),
    monitoring_ready: Joi.boolean().required(),
    dependency_mapped: Joi.boolean().required(),
  }),
  emergency_justification: Joi.string().min(10).max(2000).allow('', null),
  retro_due_at: Joi.date().allow(null),
  actual_downtime_minutes: Joi.number().integer().min(0).max(10080),
  post_implementation_notes: Joi.string().max(4000).allow('', null),
  pir_required: Joi.boolean(),
  pir_completed: Joi.boolean(),
  pir_notes: Joi.string().max(4000).allow('', null),
  approval_due_at: Joi.date().allow(null),
  approved_within_sla: Joi.boolean(),
}).min(1);

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

router.get('/check-conflicts', authenticate, authorize(['it_manager', 'system_admin', 'it_agent']), async (req, res, next) => {
  try {
    const { from, to, affected_systems, exclude_change_id } = req.query;
    if (!from || !to || !affected_systems) {
      return res.json({ status: 'success', data: { conflicts: [] } });
    }
    const conflicts = await ChangeModel.findConflictingChanges({
      from,
      to,
      affectedSystemsStr: affected_systems,
      excludeChangeId: exclude_change_id || null,
    });
    res.json({ status: 'success', data: { conflicts } });
  } catch (err) {
    next(err);
  }
});

router.get('/calendar/upcoming', authenticate, authorize(['it_manager', 'system_admin', 'it_agent']), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const changes = from && to
      ? await ChangeModel.listChangesOverlapping({ from, to })
      : await ChangeModel.listChanges({ status: 'scheduled' });
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

    const governanceErrors = validateChangePayload(value, { isCreate: true });
    if (governanceErrors.length > 0) {
      return res.status(400).json({ status: 'error', message: governanceErrors.join(', ') });
    }

    const change_number = await generateChangeNumber();
    const isAutoApproved = canAutoApprove(value.change_type, value.risk_assessment);
    const retroDueAt = value.change_type === 'emergency'
      ? new Date(Date.now() + (24 * 60 * 60 * 1000))
      : null;
    const approvalDueAt = getApprovalDueAt(value.risk_assessment);
    const approvedAt = isAutoApproved ? new Date() : null;
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
      status: isAutoApproved ? 'approved' : 'submitted',
      approved_at: approvedAt,
      business_impact: value.business_impact || null,
      communication_plan: value.communication_plan || null,
      dependency_map: value.dependency_map || null,
      role_assignments: {
        ...value.role_assignments,
        requester_user_id: value.role_assignments?.requester_user_id || req.user.user_id,
      },
      technical_checklist: value.technical_checklist,
      emergency_justification: value.emergency_justification || null,
      retro_due_at: value.retro_due_at || retroDueAt,
      pir_required: value.change_type === 'emergency' || ['high', 'critical'].includes(value.risk_assessment),
      pir_completed: false,
      approval_due_at: approvalDueAt,
      approved_within_sla: isAutoApproved ? approvedAt <= approvalDueAt : null,
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

    const governanceErrors = validateChangePayload(
      { ...existing, ...value },
      { isCreate: false },
    );
    if (governanceErrors.length > 0) {
      return res.status(400).json({ status: 'error', message: governanceErrors.join(', ') });
    }

    const updates = { ...value };
    if (updates.status) {
      const previousRank = statusRank(existing.status);
      const nextRank = statusRank(updates.status);
      if (nextRank < previousRank && req.user.role !== 'system_admin') {
        return res.status(400).json({ status: 'error', message: 'Only system admin can move status backward.' });
      }
      if (existing.status === 'rejected' && updates.status !== 'rejected') {
        return res.status(400).json({ status: 'error', message: 'Rejected changes cannot be reopened directly.' });
      }
    }

    if (
      updates.status === 'closed' &&
      (existing.pir_required || updates.pir_required) &&
      !(updates.pir_completed || existing.pir_completed)
    ) {
      return res.status(400).json({ status: 'error', message: 'PIR must be completed before closing this change.' });
    }

    if (updates.status === 'approved') updates.approved_at = new Date();
    if (updates.status === 'implemented') updates.implemented_at = new Date();
    if (updates.status === 'closed') updates.closed_at = new Date();

    if (updates.status === 'implemented') {
      const plannedMinutes =
        existing.change_window_start && existing.change_window_end
          ? Math.max(
              0,
              Math.round(
                (new Date(existing.change_window_end).getTime() - new Date(existing.change_window_start).getTime()) / 60000,
              ),
            )
          : null;
      if (plannedMinutes != null && updates.actual_downtime_minutes == null) {
        updates.actual_downtime_minutes = plannedMinutes;
      }
    }

    const change = await ChangeModel.updateChange(req.params.id, updates);
    res.json({ status: 'success', data: { change } });
  } catch (err) {
    next(err);
  }
});

async function deleteRejectedChangeHandler(req, res, next) {
  try {
    const existing = await ChangeModel.getChangeById(req.params.id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Change not found' });
    if (existing.status !== 'rejected') {
      return res.status(400).json({ status: 'error', message: 'Only rejected change requests can be deleted.' });
    }

    const deleted = await ChangeModel.deleteChange(req.params.id);
    if (!deleted) return res.status(404).json({ status: 'error', message: 'Change not found' });

    res.json({ status: 'success', data: { change: deleted } });
  } catch (err) {
    next(err);
  }
}

router.delete('/:id', authenticate, authorize(['it_manager', 'system_admin']), deleteRejectedChangeHandler);
router.post('/:id/delete', authenticate, authorize(['it_manager', 'system_admin']), deleteRejectedChangeHandler);

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
    if (existing.status === 'rejected') {
      return res.status(400).json({ status: 'error', message: 'Rejected changes can no longer be approved.' });
    }

    await ChangeModel.upsertApprover(req.params.id, req.user.user_id, value.status, value.comment);

    const approvers = await ChangeModel.listApprovers(req.params.id);
    const hasRejected = approvers.some((a) => a.approval_status === 'rejected');
    const allApproved = approvers.length > 0 && approvers.every((a) => a.approval_status === 'approved');

    let nextStatus = existing.status;
    if (hasRejected) nextStatus = 'rejected';
    if (allApproved) nextStatus = 'approved';

    if (nextStatus !== existing.status) {
      const approvedAt = nextStatus === 'approved' ? new Date() : null;
      await ChangeModel.updateChange(req.params.id, {
        status: nextStatus,
        approved_at: approvedAt,
        approved_within_sla: nextStatus === 'approved'
          ? (existing.approval_due_at ? approvedAt <= new Date(existing.approval_due_at) : null)
          : null,
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

module.exports = router;
