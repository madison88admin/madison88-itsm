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

        // 3. Mocked System Metrics (in a real app, these would come from monitoring tools)
        const metrics = [
            { type: 'metric', label: 'Internet Speed', value: '942 Mbps', status: 'optimal' },
            { type: 'metric', label: 'Server Latency', value: '14ms', status: 'optimal' },
            { type: 'metric', label: 'Active Agents', value: '12', status: 'info' }
        ];

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
        return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
};

module.exports = PulseService;
