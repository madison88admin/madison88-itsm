const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const TEST_USER = {
    email: `testuser_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test Logic User',
    department: 'QA',
    location: 'Philippines'
};

async function verify() {
    console.log('--- STARTING AUTH LOGIC VERIFICATION ---');

    try {
        // 1. Signup
        console.log(`1. Attempting to register ${TEST_USER.email}...`);
        const registerRes = await axios.post(`${API_URL}/auth/register`, TEST_USER);
        console.log('   Signup Response Body:', JSON.stringify(registerRes.data, null, 2));

        const registeredUser = registerRes.data.user;
        if (registeredUser?.role !== 'end_user') {
            throw new Error(`Invalid role assigned: ${registeredUser?.role}`);
        }
        console.log('   Role correctly assigned as end_user');

        // 2. Login
        console.log('2. Attempting to login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        console.log('   Login Response Body:', JSON.stringify(loginRes.data, null, 2));

        const token = loginRes.data.token;
        console.log('   Login Success. Token received:', !!token);

        // 3. Verify Session (/me)
        console.log('3. Verifying session data...');
        const meRes = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   /me Response Body:', JSON.stringify(meRes.data, null, 2));

        const meUser = meRes.data.user;
        console.log('   /me Data Received. User Email:', meUser?.email);
        if (meUser?.email !== TEST_USER.email) {
            throw new Error('Email mismatch in session data');
        }

        console.log('\n--- VERIFICATION COMPLETE: ALL FLOWS LOGICALLY SOUND ---');
        console.log('Note: Check server logs for Notification triggers.');
    } catch (err) {
        console.error('\n--- VERIFICATION FAILED ---');
        console.error(err.response?.data || err.message);
        process.exit(1);
    }
}

verify();
