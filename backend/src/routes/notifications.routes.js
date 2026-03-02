const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth.middleware');
const NotificationsModel = require('../models/notifications.model');

const router = express.Router();

router.get('/preferences', authenticate, async (req, res, next) => {
  try {
    const preferences = await NotificationsModel.getPreferences(req.user.user_id);
    res.json({ status: 'success', data: { preferences } });
  } catch (err) {
    next(err);
  }
});

router.patch('/preferences', authenticate, async (req, res, next) => {
  try {
    const schema = Joi.object({
      ticket_updates_enabled: Joi.boolean(),
      broadcast_enabled: Joi.boolean(),
      browser_push_enabled: Joi.boolean(),
      email_enabled: Joi.boolean(),
      quiet_hours_enabled: Joi.boolean(),
      quiet_hours_start: Joi.string().pattern(/^\d{2}:\d{2}$/),
      quiet_hours_end: Joi.string().pattern(/^\d{2}:\d{2}$/),
      timezone: Joi.string().max(80),
    });
    const { error, value } = schema.validate(req.body || {}, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details.map((detail) => detail.message).join(', '),
      });
    }

    const preferences = await NotificationsModel.updatePreferences(req.user.user_id, value);
    res.json({ status: 'success', data: { preferences } });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { unread } = req.query;
    const notifications = await NotificationsModel.listForUser(req.user.user_id, {
      unreadOnly: unread === 'true',
    });
    res.json({ status: 'success', data: { notifications } });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    const updated = await NotificationsModel.markAllRead(req.user.user_id);
    res.json({ status: 'success', data: { updated } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const schema = Joi.object({ id: Joi.string().uuid().required() });
    const { error } = schema.validate(req.params, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details.map((detail) => detail.message).join(', '),
      });
    }
    const notification = await NotificationsModel.markRead(
      req.params.id,
      req.user.user_id,
    );
    if (!notification) {
      return res.status(404).json({ status: 'error', message: 'Not found' });
    }
    res.json({ status: 'success', data: { notification } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
