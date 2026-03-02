const db = require('../config/database');

const PulseService = {
    async getPulseEvents() {
        // 1. Get recent ticket resolutions (last 24h)
        const recentResolutions = await db.query(`
      SELECT 'resolution' as type, 
             ticket_number as reference, 
             title, 
             updated_at as timestamp,
             priority
      FROM tickets 
      WHERE status = 'Resolved' 
      AND updated_at >= NOW() - INTERVAL '24 hours'
      ORDER BY updated_at DESC
      LIMIT 10
    `);

        // 2. Get recent KB publications
        const recentKB = await db.query(`
      SELECT 'kb_article' as type, 
             slug as reference, 
             title, 
             published_at as timestamp
      FROM knowledge_base_articles
      WHERE status = 'published'
      AND published_at >= NOW() - INTERVAL '7 days'
      ORDER BY published_at DESC
      LIMIT 5
    `);

        // 3. Build live metrics from DB state (no hardcoded/demo values)
        const openTickets = await db.query(`
            SELECT COUNT(*)::int as count
            FROM tickets
            WHERE status NOT IN ('Resolved', 'Closed')
        `);

        const activeSupportStaff = await db.query(`
            SELECT COUNT(DISTINCT u.user_id)::int as count
            FROM users u
            JOIN user_activity_logs ual ON u.user_id = ual.user_id
            WHERE u.role IN ('it_agent', 'it_manager')
              AND u.is_active = true
              AND ual.activity_timestamp > NOW() - INTERVAL '15 minutes'
        `);

        const metrics = [
            {
                type: 'metric',
                label: 'Open Tickets',
                value: String(openTickets.rows[0]?.count || 0),
                status: (openTickets.rows[0]?.count || 0) > 50 ? 'warning' : 'optimal'
            },
            {
                type: 'metric',
                label: 'Active Support Staff',
                value: String(activeSupportStaff.rows[0]?.count || 0),
                status: (activeSupportStaff.rows[0]?.count || 0) > 0 ? 'info' : 'warning'
            }
        ];

        // Calculate system health status
        const criticalBreaches = await db.query(`
            SELECT COUNT(*)::int as count 
            FROM tickets 
            WHERE priority = 'P1' 
            AND status NOT IN ('Resolved', 'Closed') 
            AND sla_due_date < NOW()
        `);

        const healthStatus = criticalBreaches.rows[0].count > 0 ? 'critical' : 'optimal';
        const healthText = criticalBreaches.rows[0].count > 0
            ? `${criticalBreaches.rows[0].count} P1 Breaches Detected`
            : 'All systems operational';

        // Combine and format
        const events = [
            ...recentResolutions.rows.map(r => ({
                type: 'resolution',
                text: `${r.priority} Resolved: ${r.title} (${r.reference})`,
                timestamp: r.timestamp
            })),
            ...recentKB.rows.map(k => ({
                type: 'kb',
                text: `New Knowledge Base: ${k.title}`,
                timestamp: k.timestamp
            })),
            ...metrics.map(m => ({
                type: 'metric',
                text: `${m.label}: ${m.value}`,
                status: m.status,
                timestamp: new Date()
            }))
        ];

        // Sort by timestamp descending
        const sortedEvents = events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            events: sortedEvents,
            systemHealth: {
                status: healthStatus,
                text: healthText,
                timestamp: new Date()
            }
        };
    }
};

module.exports = PulseService;

