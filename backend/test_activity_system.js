/**
 * Test User Activity System
 * Verifies that:
 * 1. Database table exists and has data
 * 2. API endpoints are working
 * 3. Location filtering is functional
 */

const pool = require('./src/config/database');
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let testToken = null;
let testUserId = null;

async function log(message, data = '') {
  console.log(`\n✓ ${message}`);
  if (data) console.log(`  ${JSON.stringify(data, null, 2)}`);
}

async function error(message, err = '') {
  console.error(`\n✗ ${message}`);
  if (err) console.error(`  ${err.message || err}`);
}

// Step 1: Check if table exists
async function checkDatabaseTable() {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_activity_logs'
      )
    `);
    if (result.rows[0].exists) {
      await log('Database table user_activity_logs exists ✓');
      
      // Count records
      const count = await pool.query('SELECT COUNT(*) as total FROM user_activity_logs');
      await log(`Activity logs in database: ${count.rows[0].total} records`);
      
      // Show recent logins
      const recent = await pool.query(`
        SELECT 
          user_id, activity_type, activity_timestamp, location
        FROM user_activity_logs 
        WHERE activity_type IN ('LOGIN', 'LOGOUT')
        ORDER BY activity_timestamp DESC 
        LIMIT 5
      `);
      if (recent.rows.length > 0) {
        await log('Recent login/logout activity:');
        recent.rows.forEach(r => {
          console.log(`  - ${r.activity_type} at ${r.activity_timestamp} (Location: ${r.location || 'NULL'})`);
        });
      }
    } else {
      throw new Error('Table not found - migration may not have run');
    }
  } catch (err) {
    await error('Database table check failed', err);
    process.exit(1);
  }
}

// Step 2: Login to get token
async function loginTestUser() {
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (res.data.token) {
      testToken = res.data.token;
      testUserId = res.data.user.user_id;
      await log(`Login successful - Token obtained for user: ${res.data.user.email}`, {
        role: res.data.user.role,
        location: res.data.user.location,
        userId: testUserId
      });
    } else {
      throw new Error('No token in response');
    }
  } catch (err) {
    // Try with admin user if test user doesn't exist
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@madison88.com',
        password: 'admin123'
      });
      testToken = res.data.token;
      testUserId = res.data.user.user_id;
      await log(`Login successful with admin - Token obtained for: ${res.data.user.email}`, {
        role: res.data.user.role,
        location: res.data.user.location,
        userId: testUserId
      });
    } catch (err2) {
      await error('Login failed for both test and admin user', err2);
      process.exit(1);
    }
  }
}

// Step 3: Check active users endpoint
async function checkActiveUsersEndpoint() {
  try {
    const res = await axios.get(`${API_BASE}/admin/active-users?withinMinutes=15`, {
      headers: { 'Authorization': `Bearer ${testToken}` }
    });
    
    await log('Active Users Endpoint Response:', {
      count: res.data.data.count,
      location: res.data.data.location,
      timestamp: res.data.data.timestamp
    });
    
    if (res.data.data.activeUsers.length > 0) {
      console.log('  Active users:');
      res.data.data.activeUsers.slice(0, 3).forEach(u => {
        console.log(`    - ${u.full_name} (${u.email}) - ${u.minutes_since_activity}m ago - Location: ${u.location}`);
      });
    } else {
      console.log('  (No active users within last 15 minutes)');
    }
  } catch (err) {
    await error('Active Users endpoint failed', err);
  }
}

// Step 4: Check activity stats endpoint
async function checkActivityStatsEndpoint() {
  try {
    const res = await axios.get(`${API_BASE}/admin/activity-stats?period=24h`, {
      headers: { 'Authorization': `Bearer ${testToken}` }
    });
    
    await log('Activity Stats Endpoint Response:', {
      location: res.data.data.location,
      period: res.data.data.period,
      stats: res.data.data.statistics
    });
  } catch (err) {
    await error('Activity Stats endpoint failed', err);
  }
}

// Step 5: Verify recent login was logged
async function checkRecentLogin() {
  try {
    const result = await pool.query(`
      SELECT 
        activity_type, activity_timestamp, ip_address, location
      FROM user_activity_logs 
      WHERE user_id = $1 AND activity_type = 'LOGIN'
      ORDER BY activity_timestamp DESC 
      LIMIT 1
    `, [testUserId]);
    
    if (result.rows.length > 0) {
      const login = result.rows[0];
      await log('Recent login logged in database:', {
        timestamp: login.activity_timestamp,
        ipAddress: login.ip_address,
        location: login.location || 'NOT SET'
      });
    } else {
      await error('No login record found for current user');
    }
  } catch (err) {
    await error('Login verification failed', err);
  }
}

// Main test runner
async function runTests() {
  console.log('\n================================');
  console.log('  USER ACTIVITY SYSTEM TEST');
  console.log('================================\n');
  
  console.log('Running tests...\n');
  
  await checkDatabaseTable();
  await loginTestUser();
  await checkRecentLogin();
  await checkActiveUsersEndpoint();
  await checkActivityStatsEndpoint();
  
  console.log('\n================================');
  console.log('  TESTS COMPLETE');
  console.log('================================\n');
  
  await pool.end();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
