const db = require('../config/database');

const ChangeModel = {
  async getLatestChangeNumber(year) {
    const result = await db.query(
      'SELECT change_number FROM change_requests WHERE change_number LIKE $1 ORDER BY change_number DESC LIMIT 1',
      [`CHG-${year}-%`]
    );
    return result.rows[0]?.change_number || null;
  },

  async listChanges({ status, from, to }) {
    const filters = { status, from, to };
    const where = [];
    const values = [];

    if (status) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }
    if (from) {
      values.push(from);
      where.push(`change_window_start >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      where.push(`change_window_end <= $${values.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT change_id, change_number, ticket_id, title, description, change_type,
              affected_systems, implementation_plan, rollback_plan, risk_assessment,
              change_window_start, change_window_end, requested_by, status,
              created_at, updated_at, approved_at, implemented_at, closed_at
       FROM change_requests ${whereClause}
       ORDER BY created_at DESC`,
      values
    );

    return result.rows;
  },

  async getChangeById(changeId) {
    const result = await db.query(
      `SELECT change_id, change_number, ticket_id, title, description, change_type,
              affected_systems, implementation_plan, rollback_plan, risk_assessment,
              change_window_start, change_window_end, requested_by, status,
              created_at, updated_at, approved_at, implemented_at, closed_at
       FROM change_requests WHERE change_id = $1`,
      [changeId]
    );
    return result.rows[0];
  },

  async createChange(data) {
    const result = await db.query(
      `INSERT INTO change_requests
        (change_number, ticket_id, title, description, change_type, affected_systems,
         implementation_plan, rollback_plan, risk_assessment, change_window_start,
         change_window_end, requested_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        data.change_number,
        data.ticket_id,
        data.title,
        data.description,
        data.change_type,
        data.affected_systems,
        data.implementation_plan,
        data.rollback_plan,
        data.risk_assessment,
        data.change_window_start,
        data.change_window_end,
        data.requested_by,
        data.status
      ]
    );
    return result.rows[0];
  },

  async updateChange(changeId, updates) {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

    const result = await db.query(
      `UPDATE change_requests SET ${setClause}, updated_at = NOW() WHERE change_id = $${keys.length + 1} RETURNING *`,
      [...values, changeId]
    );
    return result.rows[0];
  },

  async upsertApprover(changeId, userId, status, comment) {
    const result = await db.query(
      `INSERT INTO change_approvers (change_id, user_id, approval_status, approval_comment, approved_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (change_id, user_id)
       DO UPDATE SET approval_status = EXCLUDED.approval_status,
                     approval_comment = EXCLUDED.approval_comment,
                     approved_at = NOW()
       RETURNING *`,
      [changeId, userId, status, comment || null]
    );
    return result.rows[0];
  },

  async listApprovers(changeId) {
    const result = await db.query(
      `SELECT a.approver_id, a.change_id, a.user_id, a.approval_status, a.approval_comment, a.approved_at,
              u.full_name
       FROM change_approvers a
       JOIN users u ON u.user_id = a.user_id
       WHERE a.change_id = $1`,
      [changeId]
    );
    return result.rows;
  },

  async listChangesOverlapping({ from, to }) {
    const result = await db.query(
      `SELECT change_id, change_number, title, description, change_window_start, change_window_end
       FROM change_requests
       WHERE status = 'scheduled'
         AND change_window_start IS NOT NULL
         AND change_window_end IS NOT NULL
         AND change_window_start < $2
         AND change_window_end > $1
       ORDER BY change_window_start ASC`,
      [from, to]
    );
    return result.rows;
  },

  async findConflictingChanges({ from, to, affectedSystemsStr, excludeChangeId }) {
    const values = [from, to];
    if (excludeChangeId) values.push(excludeChangeId);
    const result = await db.query(
      `SELECT change_id, change_number, title, affected_systems, change_window_start, change_window_end
       FROM change_requests
       WHERE status IN ('scheduled', 'approved', 'submitted')
         AND change_window_start IS NOT NULL
         AND change_window_end IS NOT NULL
         AND (change_window_start < $2 AND change_window_end > $1)
         ${excludeChangeId ? 'AND change_id != $3' : ''}`,
      values
    );
    const normalize = (str) =>
      (str || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    const ourSystems = new Set(normalize(affectedSystemsStr));
    if (ourSystems.size === 0) return [];
    return result.rows.filter((row) => {
      const theirSystems = normalize(row.affected_systems);
      return theirSystems.some((s) => ourSystems.has(s));
    });
  },
};

module.exports = ChangeModel;
