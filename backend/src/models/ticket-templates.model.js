const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const TicketTemplatesModel = {
  async listTemplates({ includeInactive = false } = {}) {
    const whereClause = includeInactive ? '' : 'WHERE is_active = true';
    const result = await db.query(
      `SELECT template_id, name, title, description, business_impact, category, priority,
              created_by, is_active, created_at, updated_at
       FROM ticket_templates
       ${whereClause}
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async createTemplate(data) {
    const templateId = uuidv4();
    const result = await db.query(
      `INSERT INTO ticket_templates
        (template_id, name, title, description, business_impact, category, priority, created_by, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        templateId,
        data.name,
        data.title,
        data.description,
        data.business_impact,
        data.category,
        data.priority,
        data.created_by,
        data.is_active,
      ]
    );
    return result.rows[0];
  },

  async updateTemplate(templateId, updates) {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

    const result = await db.query(
      `UPDATE ticket_templates SET ${setClause}, updated_at = NOW() WHERE template_id = $${keys.length + 1} RETURNING *`,
      [...values, templateId]
    );
    return result.rows[0];
  },
};

module.exports = TicketTemplatesModel;
