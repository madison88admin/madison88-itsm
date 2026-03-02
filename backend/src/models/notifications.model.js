const db = require('../config/database');
const defaultPrefs = (userId) => ({
  user_id: userId,
  ticket_updates_enabled: true,
  broadcast_enabled: true,
  browser_push_enabled: true,
  email_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  timezone: 'Asia/Manila',
  updated_at: new Date().toISOString(),
});

const NotificationsModel = {
  async getPreferences(userId) {
    let result;
    try {
      result = await db.query(
        `SELECT
           user_id,
           ticket_updates_enabled,
           broadcast_enabled,
           browser_push_enabled,
           email_enabled,
           quiet_hours_enabled,
           TO_CHAR(quiet_hours_start, 'HH24:MI') AS quiet_hours_start,
           TO_CHAR(quiet_hours_end, 'HH24:MI') AS quiet_hours_end,
           timezone,
           updated_at
         FROM user_notification_preferences
         WHERE user_id = $1`,
        [userId]
      );
    } catch (err) {
      if (err.code === '42P01') return defaultPrefs(userId);
      throw err;
    }

    if (result.rows[0]) return result.rows[0];

    try {
      const inserted = await db.query(
        `INSERT INTO user_notification_preferences (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
         RETURNING
           user_id,
           ticket_updates_enabled,
           broadcast_enabled,
           browser_push_enabled,
           email_enabled,
           quiet_hours_enabled,
           TO_CHAR(quiet_hours_start, 'HH24:MI') AS quiet_hours_start,
           TO_CHAR(quiet_hours_end, 'HH24:MI') AS quiet_hours_end,
           timezone,
           updated_at`,
        [userId]
      );
      return inserted.rows[0];
    } catch (err) {
      if (err.code === '42P01') return defaultPrefs(userId);
      throw err;
    }
  },

  async updatePreferences(userId, payload = {}) {
    const current = await this.getPreferences(userId);
    const next = {
      ticket_updates_enabled:
        typeof payload.ticket_updates_enabled === 'boolean'
          ? payload.ticket_updates_enabled
          : current.ticket_updates_enabled,
      broadcast_enabled:
        typeof payload.broadcast_enabled === 'boolean'
          ? payload.broadcast_enabled
          : current.broadcast_enabled,
      browser_push_enabled:
        typeof payload.browser_push_enabled === 'boolean'
          ? payload.browser_push_enabled
          : current.browser_push_enabled,
      email_enabled:
        typeof payload.email_enabled === 'boolean'
          ? payload.email_enabled
          : current.email_enabled,
      quiet_hours_enabled:
        typeof payload.quiet_hours_enabled === 'boolean'
          ? payload.quiet_hours_enabled
          : current.quiet_hours_enabled,
      quiet_hours_start:
        typeof payload.quiet_hours_start === 'string' && payload.quiet_hours_start.trim()
          ? payload.quiet_hours_start.trim()
          : current.quiet_hours_start,
      quiet_hours_end:
        typeof payload.quiet_hours_end === 'string' && payload.quiet_hours_end.trim()
          ? payload.quiet_hours_end.trim()
          : current.quiet_hours_end,
      timezone:
        typeof payload.timezone === 'string' && payload.timezone.trim()
          ? payload.timezone.trim()
          : current.timezone,
    };

    try {
      const result = await db.query(
        `INSERT INTO user_notification_preferences
           (user_id, ticket_updates_enabled, broadcast_enabled, browser_push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::time, $8::time, $9, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           ticket_updates_enabled = EXCLUDED.ticket_updates_enabled,
           broadcast_enabled = EXCLUDED.broadcast_enabled,
           browser_push_enabled = EXCLUDED.browser_push_enabled,
           email_enabled = EXCLUDED.email_enabled,
           quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
           quiet_hours_start = EXCLUDED.quiet_hours_start,
           quiet_hours_end = EXCLUDED.quiet_hours_end,
           timezone = EXCLUDED.timezone,
           updated_at = NOW()
         RETURNING
           user_id,
           ticket_updates_enabled,
           broadcast_enabled,
           browser_push_enabled,
           email_enabled,
           quiet_hours_enabled,
           TO_CHAR(quiet_hours_start, 'HH24:MI') AS quiet_hours_start,
           TO_CHAR(quiet_hours_end, 'HH24:MI') AS quiet_hours_end,
           timezone,
           updated_at`,
        [
          userId,
          next.ticket_updates_enabled,
          next.broadcast_enabled,
          next.browser_push_enabled,
          next.email_enabled,
          next.quiet_hours_enabled,
          next.quiet_hours_start,
          next.quiet_hours_end,
          next.timezone,
        ]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '42P01') return { ...defaultPrefs(userId), ...next };
      throw err;
    }
  },

  async createNotification({
    user_id,
    ticket_id,
    type,
    title,
    message,
  }) {
    const result = await db.query(
      `INSERT INTO notifications
        (user_id, ticket_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, ticket_id || null, type, title || null, message || null]
    );
    return result.rows[0];
  },

  async listForUser(userId, { unreadOnly = false, limit = 50, offset = 0 } = {}) {
    const values = [userId];
    const filters = ['n.user_id = $1'];
    if (unreadOnly) {
      filters.push('n.is_read = false');
    }
    values.push(limit);
    values.push(offset);
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT
         n.notification_id,
         n.user_id,
         n.ticket_id,
         n.type,
         n.title,
         n.message,
         n.is_read,
         n.read_at,
         n.created_at,
         t.ticket_number,
         t.title AS ticket_title
       FROM notifications n
       LEFT JOIN tickets t ON t.ticket_id = n.ticket_id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      values
    );
    return result.rows;
  },

  async markRead(notificationId, userId) {
    const result = await db.query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE notification_id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  },

  async markAllRead(userId) {
    const result = await db.query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return result.rowCount;
  },
};

module.exports = NotificationsModel;
