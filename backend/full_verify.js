const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const API_URL = 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function runFullVerification() {
    console.log('--- Starting Full Executive Action Verification ---');

    // 1. Get a real admin user ID from the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let adminUser;
    try {
        const result = await pool.query("SELECT user_id, role FROM users WHERE role IN ('system_admin', 'it_manager') AND is_active = true LIMIT 1");
        adminUser = result.rows[0];
        if (!adminUser) throw new Error('No active admin/manager found in DB');
        console.log(`Using Admin User ID: ${adminUser.user_id} (Role: ${adminUser.role})`);
    } catch (err) {
        console.error('DB query failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }

    const token = jwt.sign({ user_id: adminUser.user_id, role: adminUser.role }, JWT_SECRET);

    try {
        // 2. Test Export
        console.log('\n[1/3] Testing Report Export (CSV)...');
        const exportRes = await axios.get(`${API_URL}/dashboard/export?format=csv&token=${token}`);
        if (exportRes.status === 200 && exportRes.headers['content-type'].includes('text/csv')) {
            console.log('✅ Export Successful!');
            console.log('Sample Data:', exportRes.data.substring(0, 100));
        } else {
            console.log('❌ Export Failed. Status:', exportRes.status, 'Type:', exportRes.headers['content-type']);
        }

        // 3. Test Broadcast
        console.log('\n[2/3] Testing Broadcast...');
        const broadcastRes = await axios.post(`${API_URL}/dashboard/broadcast`,
            { message: 'Automated test broadcast.' },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('✅ Broadcast Success:', broadcastRes.data.message);

        // 4. Test Bulk Escalate
        console.log('\n[3/3] Testing Bulk Escalation...');
        const escalateRes = await axios.post(`${API_URL}/dashboard/bulk-escalate-p1`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Escalation Success:', escalateRes.data.message);

    } catch (err) {
        console.error('DIAGNOSTIC-FAILURE:', err.response?.data?.message || err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data));
        }
        process.exit(1);
    }
}

runFullVerification();
