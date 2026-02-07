const db = require('../config/database');

const SlaModel = {
  async listRules() {
    const result = await db.query(
      'SELECT sla_id, priority, response_time_hours, resolution_time_hours, escalation_threshold_percent, is_active, created_at, updated_at FROM sla_rules ORDER BY priority ASC'
    );
    return result.rows;
  },

  async upsertRule({ priority, response_time_hours, resolution_time_hours, escalation_threshold_percent, is_active }) {
    const result = await db.query(
      `INSERT INTO sla_rules (priority, response_time_hours, resolution_time_hours, escalation_threshold_percent, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (priority)
       DO UPDATE SET
         response_time_hours = EXCLUDED.response_time_hours,
         resolution_time_hours = EXCLUDED.resolution_time_hours,
         escalation_threshold_percent = EXCLUDED.escalation_threshold_percent,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING sla_id, priority, response_time_hours, resolution_time_hours, escalation_threshold_percent, is_active, created_at, updated_at`,
      [priority, response_time_hours, resolution_time_hours, escalation_threshold_percent, is_active]
    );
    return result.rows[0];
  },

  async updateRule(priority, updates) {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

    const result = await db.query(
      `UPDATE sla_rules SET ${setClause}, updated_at = NOW() WHERE priority = $${keys.length + 1}
       RETURNING sla_id, priority, response_time_hours, resolution_time_hours, escalation_threshold_percent, is_active, created_at, updated_at`,
      [...values, priority]
    );
    return result.rows[0];
  },
};

module.exports = SlaModel;
