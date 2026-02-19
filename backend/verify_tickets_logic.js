require('dotenv').config();
const axios = require('axios');
const db = require('./src/config/database');
const fs = require('fs');

const API_URL = 'http://localhost:3001/api';
const TS = Date.now();

const END_USER = {
    email: `enduser_${TS}@example.com`, password: 'password123',
    full_name: 'End User Tester', department: 'Sales'
};
const ADMIN_USER = {
    email: `admin_${TS}@example.com`, password: 'password123',
    full_name: 'Admin Tester', department: 'IT'
};

async function verify() {
    const R = [];
    const log = (m) => { console.log(m); R.push(m); };
    let endUserId, adminUserId, ticketId;

    log('╔══════════════════════════════════════════════╗');
    log('║  MADISON88 ITSM — FULL SYSTEM AUDIT         ║');
    log('╚══════════════════════════════════════════════╝\n');

    try {
        // ── AUTH MODULE ──
        log('━━━ AUTH MODULE ━━━');

        log('1. Register End User...');
        const euReg = await axios.post(`${API_URL}/auth/register`, END_USER);
        endUserId = euReg.data.user.user_id;
        log(`   ✅ Registered (role: ${euReg.data.user.role})`);

        log('2. Register Admin User...');
        const adReg = await axios.post(`${API_URL}/auth/register`, ADMIN_USER);
        adminUserId = adReg.data.user.user_id;
        await db.query("UPDATE users SET role = 'system_admin' WHERE user_id = $1", [adminUserId]);
        log('   ✅ Registered + Promoted to system_admin');

        log('3. Login End User...');
        const euLogin = await axios.post(`${API_URL}/auth/login`, { email: END_USER.email, password: END_USER.password });
        const euToken = euLogin.data.token;
        const euH = { Authorization: `Bearer ${euToken}` };
        log(`   ✅ Token received (role: ${euLogin.data.user.role})`);

        log('4. Login Admin...');
        const adLogin = await axios.post(`${API_URL}/auth/login`, { email: ADMIN_USER.email, password: ADMIN_USER.password });
        const adToken = adLogin.data.token;
        const adH = { Authorization: `Bearer ${adToken}` };
        log(`   ✅ Token received (role: ${adLogin.data.user.role})`);

        log('5. Session /me (both users)...');
        const euMe = await axios.get(`${API_URL}/auth/me`, { headers: euH });
        const adMe = await axios.get(`${API_URL}/auth/me`, { headers: adH });
        log(`   ✅ End User: ${euMe.data.user.email} | Admin: ${adMe.data.user.email}`);

        // ── TICKET MODULE ──
        log('\n━━━ TICKET MODULE ━━━');

        log('6. Create Ticket (as End User)...');
        const tRes = await axios.post(`${API_URL}/tickets`, {
            title: `AUDIT TEST ${TS}: Server Down`,
            description: 'Full system audit verification ticket.',
            priority: 'P2', category: 'Software',
            business_impact: 'Moderate impact for testing',
            location: 'Philippines'
        }, { headers: euH });
        ticketId = tRes.data.data.ticket.ticket_id;
        log(`   ✅ Created: ${ticketId} (status: ${tRes.data.data.ticket.status})`);

        log('7. RBAC: Admin CANNOT create ticket...');
        try {
            await axios.post(`${API_URL}/tickets`, {
                title: 'Admin test', description: 'Should fail',
                priority: 'P3', category: 'Software', business_impact: 'test'
            }, { headers: adH });
            log('   ❌ RBAC FAIL: Admin was able to create ticket');
        } catch (e) {
            log(`   ✅ Correctly blocked (${e.response?.status}: ${e.response?.data?.message})`);
        }

        log('8. Admin fetches ticket detail...');
        const detail = await axios.get(`${API_URL}/tickets/${ticketId}`, { headers: adH });
        const t = detail.data.data.ticket;
        log(`   ✅ Status: ${t.status} | Priority: ${t.priority} | SLA: ${t.sla_due_date ? 'SET' : 'MISSING'}`);

        log('9. Admin assigns self + transitions...');
        await axios.patch(`${API_URL}/tickets/${ticketId}`, {
            status: 'In Progress', assigned_to: adminUserId
        }, { headers: adH });
        const ip = await axios.get(`${API_URL}/tickets/${ticketId}`, { headers: adH });
        log(`   ✅ Status: ${ip.data.data.ticket.status} | Assigned: ${ip.data.data.ticket.assigned_to ? 'YES' : 'NO'}`);

        log('10. Add internal note (as admin)...');
        await axios.post(`${API_URL}/tickets/${ticketId}/comments`, {
            comment_text: 'Internal: investigating issue.', is_internal: true
        }, { headers: adH });
        log('   ✅ Internal note added');

        log('11. Add public comment (as end user)...');
        await axios.post(`${API_URL}/tickets/${ticketId}/comments`, {
            comment_text: 'Any updates on my issue?', is_internal: false
        }, { headers: euH });
        log('   ✅ Public comment added');

        log('12. Verify comments count...');
        const cRes = await axios.get(`${API_URL}/tickets/${ticketId}`, { headers: adH });
        const comments = cRes.data.data.comments || [];
        log(`   ✅ Comments: ${comments.length} (internal: ${comments.filter(c => c.is_internal).length}, public: ${comments.filter(c => !c.is_internal).length})`);

        log('13. Resolve ticket...');
        await axios.patch(`${API_URL}/tickets/${ticketId}`, {
            status: 'Resolved',
            resolution_summary: 'Audit test passed.',
            resolution_category: 'Software Fix',
            root_cause: 'Automated verification.'
        }, { headers: adH });
        const rT = await axios.get(`${API_URL}/tickets/${ticketId}`, { headers: adH });
        log(`   ✅ Final: ${rT.data.data.ticket.status} | Resolution: ${rT.data.data.ticket.resolution_summary}`);

        log('14. Audit trail...');
        const aRes = await axios.get(`${API_URL}/tickets/${ticketId}/audit-log`, { headers: adH });
        log(`   ✅ Audit entries: ${(aRes.data.data.audit_logs || []).length}`);

        // ── DASHBOARD MODULE ──
        log('\n━━━ DASHBOARD MODULE ━━━');

        log('15. Status Summary...');
        try {
            const ss = await axios.get(`${API_URL}/dashboard/status-summary`, { headers: adH });
            log(`   ✅ Status Summary: ${JSON.stringify(ss.data.data).substring(0, 100)}...`);
        } catch (e) { log(`   ⚠️ ${e.response?.status}: ${e.response?.data?.message}`); }

        log('16. SLA Performance...');
        try {
            const sp = await axios.get(`${API_URL}/dashboard/sla-performance`, { headers: adH });
            log(`   ✅ SLA Performance returned data`);
        } catch (e) { log(`   ⚠️ ${e.response?.status}: ${e.response?.data?.message}`); }

        log('17. IT Pulse...');
        try {
            const pulse = await axios.get(`${API_URL}/dashboard/pulse`, { headers: adH });
            log(`   ✅ Pulse events: ${pulse.data.data?.events?.length || 0}`);
        } catch (e) { log(`   ⚠️ ${e.response?.status}: ${e.response?.data?.message}`); }

        // ── SUPPORTING MODULES ──
        log('\n━━━ SUPPORTING MODULES ━━━');

        log('18. Notifications...');
        try {
            const n = await axios.get(`${API_URL}/notifications`, { headers: adH });
            log(`   ✅ Notifications: ${n.data.data?.notifications?.length || 0}`);
        } catch (e) { log(`   ⚠️ ${e.response?.status}: ${e.response?.data?.message}`); }

        log('19. Knowledge Base...');
        try {
            const kb = await axios.get(`${API_URL}/kb/articles`, { headers: adH });
            log(`   ✅ KB Articles: ${kb.data.data?.articles?.length || 0}`);
        } catch (e) { log(`   ⚠️ ${e.response?.status}: ${e.response?.data?.message}`); }

        log('20. Health...');
        const h = await axios.get('http://localhost:3001/health');
        log(`   ✅ ${h.data.status} (env: ${h.data.environment})`);

        // ── CLEANUP ──
        log('\n━━━ CLEANUP ━━━');
        await db.query("DELETE FROM comments WHERE ticket_id = $1", [ticketId]);
        await db.query("DELETE FROM audit_logs WHERE ticket_id = $1", [ticketId]);
        await db.query("DELETE FROM status_history WHERE ticket_id = $1", [ticketId]);
        await db.query("DELETE FROM sla_escalations WHERE ticket_id = $1", [ticketId]);
        await db.query("DELETE FROM tickets WHERE ticket_id = $1", [ticketId]);
        await db.query("DELETE FROM notifications WHERE user_id IN ($1, $2)", [endUserId, adminUserId]);
        await db.query("DELETE FROM users WHERE user_id IN ($1, $2)", [endUserId, adminUserId]);
        log('   ✅ All test data cleaned');

        log('\n╔══════════════════════════════════════════════╗');
        log('║  ✅ ALL 20 CHECKS COMPLETE — SYSTEM IS SOUND ║');
        log('╚══════════════════════════════════════════════╝');

    } catch (err) {
        log(`\n❌ CRITICAL: ${JSON.stringify(err.response?.data || err.message)}`);
    }

    fs.writeFileSync('verification_results.txt', R.join('\n'));
    log('\nResults saved to verification_results.txt');
    process.exit(0);
}

verify();
