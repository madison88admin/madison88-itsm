const Queue = require('bull');
const db = require('../config/database');

const queueUrl = process.env.REDIS_URL || (process.env.REDIS_HOST && process.env.REDIS_PORT
  ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` : null);
const queue = queueUrl ? new Queue('m88-itsm-notifications', queueUrl) : null;

async function enqueueEmail(payload) {
  if (!queue) return false;
  const result = await db.query(
    `INSERT INTO notification_outbox (kind, payload, status) VALUES ('email', $1::jsonb, 'queued') RETURNING outbox_id`,
    [JSON.stringify(payload)]
  );
  await queue.add({ outboxId: result.rows[0].outbox_id }, { attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000 });
  return true;
}

function getQueue() { return queue; }
module.exports = { enqueueEmail, getQueue };
