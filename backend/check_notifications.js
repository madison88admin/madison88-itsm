require('dotenv').config();
const db = require('./src/config/database');

async function checkNotifications() {
    try {
        const result = await db.query(`
      SELECT n.notification_id, n.type, n.title, n.message, n.ticket_id, t.ticket_number 
      FROM notifications n 
      LEFT JOIN tickets t ON t.ticket_id = n.ticket_id 
      WHERE n.type <> 'broadcast'
      ORDER BY n.created_at DESC 
      LIMIT 10;
    `);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error('Error checking notifications:', err);
    } finally {
        process.exit();
    }
}

checkNotifications();
