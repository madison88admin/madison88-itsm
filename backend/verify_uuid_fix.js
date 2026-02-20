const axios = require('axios');
require('dotenv').config();

const API_URL = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '') + '/api';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const jwt = require('jsonwebtoken');

async function testInvalidUuid() {
    console.log('Testing Invalid UUID Handling...');

    // Create a token with a valid UUID lookalike but not quite
    const token = jwt.sign({ user_id: 'not-a-uuid' }, JWT_SECRET);

    try {
        console.log('1. Testing authenticate middleware with invalid user_id in token...');
        await axios.get(`${API_URL}/tickets`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (err) {
        console.log('Result:', err.response?.status, err.response?.data?.message);
    }

    // Use a valid token but pass "null" as ticket ID
    const validToken = jwt.sign({
        user_id: '62530f75-a4d6-4d57-9778-0eae86e00f12',
        email: 'admin@madison88.com',
        role: 'system_admin'
    }, JWT_SECRET);

    try {
        console.log('\n2. Testing validateId middleware with "null" ticket ID...');
        await axios.get(`${API_URL}/tickets/null`, {
            headers: { Authorization: `Bearer ${validToken}` }
        });
    } catch (err) {
        console.log('Result:', err.response?.status, err.response?.data?.message);
    }

    try {
        console.log('\n3. Testing validateId middleware with malformed UUID...');
        await axios.get(`${API_URL}/tickets/123-abc`, {
            headers: { Authorization: `Bearer ${validToken}` }
        });
    } catch (err) {
        console.log('Result:', err.response?.status, err.response?.data?.message);
    }
}

testInvalidUuid();
