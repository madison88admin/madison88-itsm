const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  return transporter;
}

async function sendEmail({ to, subject, text }) {
  const mailer = getTransporter();
  if (!mailer) {
    logger.warn('SMTP not configured. Skipping email.', { subject, to });
    return false;
  }

  const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  try {
    await mailer.sendMail({ from, to, subject, text });
    return true;
  } catch (err) {
    logger.error('Failed to send email', { error: err.message, to, subject });
    return false;
  }
}

async function sendEscalationNotice({ ticket, escalation, requester, assignee }) {
  const recipients = [];
  if (assignee?.email) recipients.push(assignee.email);
  if (requester?.email) recipients.push(requester.email);
  if (!recipients.length) return false;

  const subject = `Ticket Escalated: ${ticket.ticket_number}`;
  const text = [
    `Ticket ${ticket.ticket_number} has been escalated.`,
    `Title: ${ticket.title}`,
    `Severity: ${escalation.severity}`,
    `Reason: ${escalation.reason}`,
  ].join('\n');

  return sendEmail({ to: recipients.join(','), subject, text });
}

async function sendSlaEscalationNotice({ ticket, escalation, assignee, leads }) {
  const recipients = [];
  if (assignee?.email) recipients.push(assignee.email);
  if (leads && leads.length) {
    leads.forEach((lead) => {
      if (lead.email) recipients.push(lead.email);
    });
  }
  const uniqueRecipients = Array.from(new Set(recipients));
  if (!uniqueRecipients.length) return false;

  const subject = `SLA Escalation: ${ticket.ticket_number}`;
  const text = [
    `Ticket ${ticket.ticket_number} reached SLA threshold.`,
    `Title: ${ticket.title}`,
    `Priority: ${ticket.priority}`,
    `Severity: ${escalation.severity}`,
    `Reason: ${escalation.reason}`,
  ].join('\n');

  return sendEmail({ to: uniqueRecipients.join(','), subject, text });
}

module.exports = { sendEmail, sendEscalationNotice, sendSlaEscalationNotice };
