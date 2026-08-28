#!/usr/bin/env node
require('dotenv').config();
const db = require('../config/database');
const { getQueue } = require('../services/notification-queue.service');
const NotificationService = require('../services/notification.service');
const queue = getQueue();
if (!queue) throw new Error('Redis is required for the notification worker');

queue.process(async (job) => {
  const result = await db.query(`SELECT payload FROM notification_outbox WHERE outbox_id = $1 AND status IN ('queued','retry')`, [job.data.outboxId]);
  if (!result.rows[0]) return;
  await db.query(`UPDATE notification_outbox SET status='processing', attempts=attempts+1, updated_at=NOW() WHERE outbox_id=$1`, [job.data.outboxId]);
  try {
    process.env.NOTIFICATION_WORKER_PROCESSING = 'true';
    await NotificationService.sendEmail(result.rows[0].payload);
    await db.query(`UPDATE notification_outbox SET status='sent', sent_at=NOW(), updated_at=NOW() WHERE outbox_id=$1`, [job.data.outboxId]);
  } catch (err) {
    await db.query(`UPDATE notification_outbox SET status='retry', last_error=$2, updated_at=NOW() WHERE outbox_id=$1`, [job.data.outboxId, err.message]);
    throw err;
  } finally { delete process.env.NOTIFICATION_WORKER_PROCESSING; }
});
console.log('M88 ITSM notification worker started');
