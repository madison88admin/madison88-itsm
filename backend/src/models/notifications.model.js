const db = require('../config/database');

const NotificationsModel = {
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
