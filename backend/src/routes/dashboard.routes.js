/**
 * Dashboard Routes
 * GET /api/dashboard/sla-performance
 * GET /api/dashboard/ticket-volume
 * GET /api/dashboard/team-performance
 * GET /api/dashboard/aging-report
 * GET /api/dashboard/export
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const router = express.Router();

async function loadSlaPerformance(db) {
  try {
    const result = await db.query('SELECT * FROM sla_performance_summary');
    return result.rows.reduce((acc, row) => {
      acc[row.priority] = {
        total: parseInt(row.total_tickets, 10),
        met: parseInt(row.sla_met, 10),
        breached: parseInt(row.sla_breached, 10),
        compliance: parseFloat(row.sla_compliance_percent),
      };
      return acc;
    }, {});
  } catch (err) {
    const fallback = await db.query(
      `SELECT priority,
              COUNT(*)::int AS total,
              SUM(CASE WHEN sla_due_date IS NOT NULL
                        AND sla_due_date < NOW()
                        AND status NOT IN ('Resolved','Closed')
                   THEN 1 ELSE 0 END)::int AS breached
       FROM tickets
       GROUP BY priority`
    );
    return fallback.rows.reduce((acc, row) => {
      const total = parseInt(row.total, 10);
      const breached = parseInt(row.breached, 10);
      acc[row.priority] = {
        total,
        met: Math.max(total - breached, 0),
        breached,
        compliance: total ? Number((((total - breached) / total) * 100).toFixed(2)) : 0,
      };
      return acc;
    }, {});
  }
}

async function loadAgingReport(db) {
  try {
    const result = await db.query('SELECT * FROM aging_tickets');
    return {
      over_7_days: result.rows.filter((row) => row.age_category === 'over_7_days'),
      over_14_days: result.rows.filter((row) => row.age_category === 'over_14_days'),
      over_30_days: result.rows.filter((row) => row.age_category === 'over_30_days'),
    };
  } catch (err) {
    const result = await db.query(
      `SELECT
         SUM(CASE WHEN created_at <= NOW() - INTERVAL '7 days'
                   AND created_at > NOW() - INTERVAL '14 days' THEN 1 ELSE 0 END)::int AS over_7_days_count,
         SUM(CASE WHEN created_at <= NOW() - INTERVAL '14 days'
                   AND created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END)::int AS over_14_days_count,
         SUM(CASE WHEN created_at <= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END)::int AS over_30_days_count
       FROM tickets
       WHERE status NOT IN ('Resolved','Closed')`
    );
    return {
      over_7_days: [],
      over_14_days: [],
      over_30_days: [],
      ...result.rows[0],
    };
  }
}

/**
 * @route GET /api/dashboard/sla-performance
 * @desc Get SLA performance metrics
 */
router.get('/sla-performance', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const sla_performance = await loadSlaPerformance(db);

    res.json({ status: 'success', data: { sla_performance } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/dashboard/ticket-volume
 * @desc Get ticket volume metrics
 */
router.get('/ticket-volume', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const group = async (column) => {
      const res = await db.query(`SELECT ${column} as key, COUNT(*)::int as value FROM tickets GROUP BY ${column}`);
      return res.rows;
    };

    const [by_status, by_category, by_priority, by_location] = await Promise.all([
      group('status'),
      group('category'),
      group('priority'),
      group('location'),
    ]);

    res.json({
      status: 'success',
      data: {
        ticket_volume: {
          by_status,
          by_category,
          by_priority,
          by_location,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/dashboard/team-performance
 * @desc Get team performance metrics
 */
router.get('/team-performance', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const result = await db.query('SELECT * FROM team_performance_summary');
    res.json({ status: 'success', data: { team_performance: { teams: result.rows } } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/dashboard/aging-report
 * @desc Get aging report
 */
router.get('/aging-report', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const aging_report = await loadAgingReport(db);
    res.json({ status: 'success', data: { aging_report } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/dashboard/status-summary
 * @desc Get ticket status summary
 */
router.get('/status-summary', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const result = await db.query('SELECT status, COUNT(*)::int AS count FROM tickets GROUP BY status');
    const status_counts = result.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});

    const open = (status_counts['New'] || 0) + (status_counts['In Progress'] || 0);
    const summary = {
      open,
      in_progress: status_counts['In Progress'] || 0,
      pending: status_counts['Pending'] || 0,
      resolved: status_counts['Resolved'] || 0,
      closed: status_counts['Closed'] || 0,
      reopened: status_counts['Reopened'] || 0,
    };

    res.json({ status: 'success', data: { status_counts, summary } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/dashboard/sla-summary
 * @desc Get SLA breach summary (admin)
 */
router.get('/sla-summary', authenticate, authorize(['system_admin']), async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const result = await db.query(
      `SELECT
         SUM(CASE WHEN sla_due_date IS NOT NULL
                   AND sla_due_date < NOW()
                   AND status NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END)::int AS total_breached,
         SUM(CASE WHEN priority = 'P1'
                   AND sla_due_date IS NOT NULL
                   AND sla_due_date < NOW()
                   AND status NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END)::int AS critical_breached
       FROM tickets`
    );
    const summary = result.rows[0] || { total_breached: 0, critical_breached: 0 };
    res.json({ status: 'success', data: { summary } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/dashboard/export
 * @desc Export dashboard data as CSV or JSON
 */
router.get('/export', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const { format = 'json', start_date, end_date } = req.query;
    const db = req.app.get('db');
    const filters = [];
    const values = [];
    if (start_date) {
      values.push(start_date);
      filters.push(`created_at >= $${values.length}`);
    }
    if (end_date) {
      values.push(end_date);
      filters.push(`created_at <= $${values.length}`);
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT ticket_number, category, priority, status, location, created_at, resolved_at, sla_due_date
       FROM tickets ${whereClause} ORDER BY created_at DESC`,
      values
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard-export.csv');
      const header = 'ticket_number,category,priority,status,location,created_at,resolved_at,sla_due_date';
      const rows = result.rows.map((row) => [
        row.ticket_number,
        row.category,
        row.priority,
        row.status,
        row.location,
        row.created_at,
        row.resolved_at,
        row.sla_due_date,
      ].join(','));
      return res.send([header, ...rows].join('\n'));
    }

    res.json({ status: 'success', data: { tickets: result.rows } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/dashboard/advanced-reporting
 * @desc Advanced reporting metrics and trends
 */
router.get('/advanced-reporting', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const db = req.app.get('db');

    const mttrResult = await db.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) AS mttr_hours
       FROM tickets WHERE resolved_at IS NOT NULL`
    );
    const mttr_hours = Number(mttrResult.rows[0]?.mttr_hours || 0);

    const mttaResult = await db.query(
      `WITH first_response AS (
         SELECT t.ticket_id, MIN(c.created_at) AS first_response_at
         FROM tickets t
         JOIN ticket_comments c ON c.ticket_id = t.ticket_id
         JOIN users u ON u.user_id = c.user_id
         WHERE u.role IN ('it_agent','it_manager','system_admin')
         GROUP BY t.ticket_id
       )
       SELECT AVG(EXTRACT(EPOCH FROM (fr.first_response_at - t.created_at)) / 3600) AS mtta_hours
       FROM tickets t
       JOIN first_response fr ON fr.ticket_id = t.ticket_id`
    );
    const mtta_hours = Number(mttaResult.rows[0]?.mtta_hours || 0);

    const volumeTrend = await db.query(
      `SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS count
       FROM tickets
       GROUP BY day
       ORDER BY day DESC
       LIMIT 30`
    );

    const slaTrend = await db.query(
      `SELECT DATE_TRUNC('day', sla_due_date)::date AS day, COUNT(*)::int AS count
       FROM tickets
       WHERE sla_due_date IS NOT NULL
         AND sla_due_date < NOW()
         AND status NOT IN ('Resolved','Closed')
       GROUP BY day
       ORDER BY day DESC
       LIMIT 30`
    );

    const agentPerf = await db.query(
      `SELECT u.user_id, u.full_name,
              COUNT(t.ticket_id)::int AS resolved_count,
              AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600) AS avg_resolution_hours
       FROM tickets t
       JOIN users u ON u.user_id = t.assigned_to
       WHERE t.resolved_at IS NOT NULL
       GROUP BY u.user_id, u.full_name
       ORDER BY resolved_count DESC
       LIMIT 10`
    );

    res.json({
      status: 'success',
      data: {
        summary: {
          mttr_hours,
          mtta_hours,
        },
        trends: {
          tickets_by_day: volumeTrend.rows,
          sla_breaches_by_day: slaTrend.rows,
        },
        agent_performance: agentPerf.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
