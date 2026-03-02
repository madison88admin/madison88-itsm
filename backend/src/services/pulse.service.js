const db = require('../config/database');
const redisClient = require('../config/redis');

const CHECK_TIMEOUT_MS = 1500;

function withTimeout(promise, timeoutMs = CHECK_TIMEOUT_MS) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error('timeout')), timeoutMs);
        }),
    ]);
}

function classifySeverity(event) {
    if (event.type === 'resolution') {
        if (event.priority === 'P1') return 'critical';
        if (event.priority === 'P2') return 'warn';
        return 'info';
    }
    if (event.type === 'metric') {
        if (event.status === 'critical') return 'critical';
        if (event.status === 'warning') return 'warn';
        return 'info';
    }
    return 'info';
}

const PulseService = {
    async getPulseEvents(user = null) {
        const startedAt = Date.now();
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
                status: (openTickets.rows[0]?.count || 0) > 50 ? 'warning' : 'info'
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

        // 4. Build check-based system health status
        const checks = [];

        const dbStart = Date.now();
        try {
            await withTimeout(db.query('SELECT 1 as ok'));
            checks.push({ key: 'db', label: 'Database', status: 'ok', latency_ms: Date.now() - dbStart });
        } catch (err) {
            checks.push({ key: 'db', label: 'Database', status: 'critical', message: 'Unreachable' });
        }

        const redisStart = Date.now();
        try {
            if (!redisClient) {
                checks.push({ key: 'redis', label: 'Redis', status: 'warning', message: 'Disabled' });
            } else {
                const pong = await withTimeout(redisClient.ping());
                checks.push({
                    key: 'redis',
                    label: 'Redis',
                    status: pong === 'PONG' ? 'ok' : 'warning',
                    latency_ms: Date.now() - redisStart,
                    message: pong === 'PONG' ? 'Connected' : 'Unexpected response',
                });
            }
        } catch (err) {
            checks.push({ key: 'redis', label: 'Redis', status: 'warning', message: 'Unavailable' });
        }

        const emailProvider = String(process.env.EMAIL_PROVIDER || '').toLowerCase();
        const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
        const brevoConfigured = Boolean(process.env.BREVO_API_KEY);
        const emailJsConfigured = Boolean(
            process.env.EMAILJS_PUBLIC_KEY &&
            process.env.EMAILJS_PRIVATE_KEY &&
            process.env.EMAILJS_SERVICE_ID &&
            process.env.EMAILJS_TEMPLATE_ID
        );
        const emailConfigured = smtpConfigured || brevoConfigured || emailJsConfigured;
        checks.push({
            key: 'smtp',
            label: 'Email Gateway',
            status: emailConfigured ? 'ok' : 'warning',
            message: emailConfigured
                ? `Configured (${emailProvider || 'smtp'})`
                : 'No email provider configured',
        });

        checks.push({
            key: 'queue',
            label: 'Queue',
            status: redisClient ? 'ok' : 'warning',
            message: redisClient ? 'Redis-backed queue ready' : 'Queue fallback mode',
        });

        const apiLatencyMs = Date.now() - startedAt;
        checks.push({
            key: 'api',
            label: 'API Latency',
            status: apiLatencyMs > 1200 ? 'warning' : 'ok',
            latency_ms: apiLatencyMs,
            message: `${apiLatencyMs}ms`,
        });

        if ((criticalBreaches.rows[0]?.count || 0) > 0) {
            checks.push({
                key: 'p1',
                label: 'P1 Breaches',
                status: 'critical',
                message: `${criticalBreaches.rows[0].count} overdue P1 ticket(s)`,
            });
        }

        const criticalCount = checks.filter((check) => check.status === 'critical').length;
        const warningCount = checks.filter((check) => check.status === 'warning').length;
        const healthStatus = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'degraded' : 'optimal';
        const healthText =
            healthStatus === 'critical'
                ? `${criticalCount} critical check(s) failing`
                : healthStatus === 'degraded'
                    ? `${warningCount} check(s) need attention`
                    : 'All systems operational';

        // Combine and format
        const events = [
            ...recentResolutions.rows.map(r => ({
                type: 'resolution',
                text: `${r.priority} Resolved: ${r.title} (${r.reference})`,
                priority: r.priority,
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

        // Deduplicate repeated texts, keep most recent first.
        const deduped = [];
        const seen = new Set();
        for (const event of events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))) {
            const signature = `${event.type}::${event.text}`;
            if (seen.has(signature)) continue;
            seen.add(signature);
            deduped.push({
                ...event,
                severity: classifySeverity(event),
            });
            if (deduped.length >= 25) break;
        }

        const includeAdminFeed = ['system_admin', 'it_manager'].includes(user?.role);
        const adminActivity = includeAdminFeed
            ? await db.query(`
                SELECT
                    a.action_type,
                    a.description,
                    a.timestamp,
                    a.entity_type,
                    a.entity_id,
                    COALESCE(u.full_name, 'System') AS actor_name
                FROM audit_logs a
                LEFT JOIN users u ON u.user_id = a.user_id
                WHERE a.action_type IN ('user_removed', 'user_force_removed', 'permanently_deleted')
                   OR (a.action_type = 'escalated' AND a.description ILIKE '%Bulk P1 escalation%')
                ORDER BY a.timestamp DESC
                LIMIT 8
            `)
            : { rows: [] };

        return {
            events: deduped,
            lastUpdated: new Date(),
            systemHealth: {
                status: healthStatus,
                text: healthText,
                checks,
                timestamp: new Date()
            },
            adminActivity: adminActivity.rows,
        };
    }
};

module.exports = PulseService;

