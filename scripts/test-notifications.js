const crypto = require('crypto');
const svc = require('../backend/src/services/notification.service');
const db = require('../backend/src/config/database');

async function pickOneUser() {
  const res = await db.query("SELECT id, email, full_name FROM users WHERE email IS NOT NULL LIMIT 1");
  return res.rows[0];
}

async function pickOneTicket() {
  try {
    const res = await db.query("SELECT ticket_id, ticket_number, title, priority FROM tickets LIMIT 1");
    return res.rows[0];
  } catch (err) {
    // Table may not exist in some test DBs
    return null;
  }
}

function makeTempPassword() {
  return crypto.randomBytes(6).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
}

async function main() {
  console.log('Starting notification test runner');

  if (!process.env.BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not set — Brevo sends will fail. Set BREVO_API_KEY in env for real tests.');
  }

  try {
    const user = await pickOneUser();
    if (!user) {
      console.error('No user found in database (users table empty). Create a test user first.');
      process.exitCode = 2;
      return;
    }

    console.log('Using user:', { id: user.id, email: user.email, full_name: user.full_name });

    // Welcome
    console.log('Sending welcome notice...');
    const welcomeResult = await svc.sendWelcomeNotice({ user });
    console.log('Welcome send result:', welcomeResult);

    // Password reset (token-based)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      await db.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);
    } catch (err) {
      console.error('Failed to insert password reset token for test run:', err.message || err);
    }
    console.log('Sending password reset (token link)...');
    const resetResult = await svc.sendPasswordResetNotice({ user, token });
    console.log('Password reset send result:', resetResult);

    // Ticket-based notification (if a ticket exists)
    const ticket = await pickOneTicket();
    if (ticket) {
      console.log('Using ticket:', ticket);
      const newTicketRes = await svc.sendNewTicketNotice({ ticket, requester: user, recipients: [user.email] });
      console.log('New ticket send result:', newTicketRes);
    } else {
      console.log('No ticket found — skipping ticket notifications.');
    }

    // Direct Brevo send (bypass other providers)
    try {
      console.log('Sending direct Brevo test email...');
      const brevoRes = await svc.sendViaBrevo({ to: user.email, subject: 'Brevo test', text: 'Hello from Brevo test runner' });
      console.log('Brevo direct response:', brevoRes);
    } catch (err) {
      console.error('Brevo direct send failed:', err.message || err);
    }
  } catch (err) {
    console.error('Error while running notification tests:', err);
  } finally {
    try {
      await db.end();
    } catch (e) {
      // ignore
    }
  }
}

main();
