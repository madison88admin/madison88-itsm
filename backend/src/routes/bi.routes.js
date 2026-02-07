const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

function buildDateFilters(query) {
  const filters = [];
  const values = [];
  if (query.start_date) {
    values.push(query.start_date);
    filters.push(`t.created_at >= $${values.length}`);
  }
  if (query.end_date) {
    values.push(query.end_date);
    filters.push(`t.created_at <= $${values.length}`);
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  return { whereClause, values };
}

router.get('/tickets', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { format = 'json' } = req.query;
    const { whereClause, values } = buildDateFilters(req.query);

    const result = await db.query(
      `SELECT
         t.ticket_id,
         t.ticket_number,
         t.created_at,
         t.resolved_at,
         t.status,
         t.priority,
         t.category,
         t.location,
         t.assigned_team,
         t.assigned_to,
         t.sla_due_date,
         t.sla_response_due,
         u.full_name AS requester_name,
         u.email AS requester_email
       FROM tickets t
       JOIN users u ON u.user_id = t.user_id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      values
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bi-tickets.csv');
      const header = [
        'ticket_id',
        'ticket_number',
        'created_at',
        'resolved_at',
        'status',
        'priority',
        'category',
        'location',
        'assigned_team',
        'assigned_to',
        'sla_due_date',
        'sla_response_due',
        'requester_name',
        'requester_email',
      ].join(',');
      const rows = result.rows.map((row) => [
        row.ticket_id,
        row.ticket_number,
        row.created_at,
        row.resolved_at,
        row.status,
        row.priority,
        row.category,
        row.location,
        row.assigned_team,
        row.assigned_to,
        row.sla_due_date,
        row.sla_response_due,
        row.requester_name,
        row.requester_email,
      ].join(','));
      return res.send([header, ...rows].join('\n'));
    }

    res.json({ status: 'success', data: { tickets: result.rows } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
