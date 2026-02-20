const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Mock a system_admin token
const adminToken = jwt.sign({ user_id: 1, role: 'system_admin' }, JWT_SECRET);

async function verifyExecutiveActions() {
    console.log('--- Verifying Executive Actions ---');

    try {
        // 1. Verify Export (with token in query param)
        console.log('\n[1/3] Testing Report Export (CSV)...');
        const exportRes = await axios.get(`${API_URL}/dashboard/export?format=csv&token=${adminToken}`);
        if (exportRes.status === 200 && exportRes.headers['content-type'].includes('text/csv')) {
            console.log('✅ Export Successful! Content starts with:', exportRes.data.substring(0, 50));
        } else {
            console.log('❌ Export Failed. Status:', exportRes.status);
        }

        // 2. Verify Broadcast
        console.log('\n[2/3] Testing Broadcast...');
        const broadcastRes = await axios.post(`${API_URL}/dashboard/broadcast`,
            { message: 'System-wide maintenance in 10 minutes.' },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('✅ Broadcast Success:', broadcastRes.data.message);

        // 3. Verify Bulk Escalate
        console.log('\n[3/3] Testing Bulk Escalation...');
        const escalateRes = await axios.post(`${API_URL}/dashboard/bulk-escalate-p1`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Escalation Success:', escalateRes.data.message);

    } catch (err) {
        console.error('DIAGNOSTIC-FAILURE:', err.response?.data?.message || err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
        }
    }
}

verifyExecutiveActions();
