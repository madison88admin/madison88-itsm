const db = require('../config/database');

const PriorityOverrideModel = {
  async createRequest({ ticket_id, requested_priority, reason, requested_by, status = 'pending' }) {
    const result = await db.query(
      `INSERT INTO ticket_priority_override_requests
        (ticket_id, requested_priority, reason, requested_by, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ticket_id, requested_priority, reason, requested_by, status]
    );
    return result.rows[0];
  },

  async getRequestById(requestId) {
    const result = await db.query(
      `SELECT * FROM ticket_priority_override_requests WHERE request_id = $1`,
      [requestId]
    );
    return result.rows[0];
  },

  async getPendingByTicket(ticketId) {
    const result = await db.query(
      `SELECT * FROM ticket_priority_override_requests
       WHERE ticket_id = $1 AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [ticketId]
    );
    return result.rows[0];
  },

  async listByTicket(ticketId) {
    const result = await db.query(
      `SELECT r.*, u.full_name AS requested_by_name, u.role AS requested_by_role,
              rv.full_name AS reviewed_by_name
       FROM ticket_priority_override_requests r
       JOIN users u ON u.user_id = r.requested_by
       LEFT JOIN users rv ON rv.user_id = r.reviewed_by
       WHERE r.ticket_id = $1
       ORDER BY r.created_at DESC`,
      [ticketId]
    );
    return result.rows;
  },

  async updateRequest(requestId, updates) {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

    const result = await db.query(
      `UPDATE ticket_priority_override_requests
       SET ${setClause}, updated_at = NOW()
       WHERE request_id = $${keys.length + 1}
       RETURNING *`,
      [...values, requestId]
    );
    return result.rows[0];
  },

  async countPending() {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM ticket_priority_override_requests
       WHERE status = 'pending'`
    );
    return result.rows[0]?.count || 0;
  },
};

module.exports = PriorityOverrideModel;
