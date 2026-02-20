const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const API_URL = 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function finalEscalationCheck() {
    console.log('--- Final Bulk Escalation Verification ---');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let adminUser;
    try {
        const result = await pool.query("SELECT user_id, role FROM users WHERE role = 'system_admin' AND is_active = true LIMIT 1");
        adminUser = result.rows[0];
        if (!adminUser) throw new Error('No active system_admin found in DB');
        console.log(`Using System Admin ID: ${adminUser.user_id}`);
    } catch (err) {
        console.error('DB query failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }

    const token = jwt.sign({ user_id: adminUser.user_id, role: adminUser.role }, JWT_SECRET);

    try {
        console.log('\n[1/1] Testing Bulk Escalation (System Admin)...');
        const escalateRes = await axios.post(`${API_URL}/dashboard/bulk-escalate-p1`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Escalation Success:', escalateRes.data.message);
        console.log('Escalated Tickets:', escalateRes.data.data.escalatedTickets);

    } catch (err) {
        console.error('DIAGNOSTIC-FAILURE:', err.response?.data?.message || err.message);
        process.exit(1);
    }
}

finalEscalationCheck();
