require('dotenv').config();
const db = require('./src/config/database');

const fs = require('fs');

async function debugUsers() {
    try {
        let output = "--- Users Identity Debug ---\n";
        const result = await db.query(
            "SELECT user_id, email, auth0_id, role, is_active FROM users ORDER BY created_at DESC LIMIT 20"
        );

        output += `Found ${result.rows.length} users:\n`;
        result.rows.forEach(r => {
            output += `ID: ${r.user_id} | Email: "${r.email}" | Auth0: ${r.auth0_id ? 'YES (' + r.auth0_id + ')' : 'NO'} | Role: ${r.role} | Active: ${r.is_active}\n`;
        });

        const nullEmails = await db.query("SELECT COUNT(*) FROM users WHERE email IS NULL");
        output += `Users with NULL email: ${nullEmails.rows[0].count}\n`;

        fs.writeFileSync('debug_output.txt', output);
        console.log("Debug output written to debug_output.txt");
    } catch (err) {
        console.error("Debug failed:", err);
    } finally {
        process.exit();
    }
}

debugUsers();
