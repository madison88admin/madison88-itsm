const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth.middleware');
const NotificationsModel = require('../models/notifications.model');

const router = express.Router();

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
