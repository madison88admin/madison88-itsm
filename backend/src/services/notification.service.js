const axios = require('axios');
const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');
const db = require('../config/database');
const logger = require('../utils/logger');

let transporter = null;
const STAFF_NOTIFICATION_ROLES = ['it_agent', 'it_manager', 'system_admin'];

function isEmailEnabled() {
  const flag = process.env.ENABLE_EMAIL_NOTIFICATIONS;
  if (!flag) return true;
  return flag.toLowerCase() === 'true' || flag === '1';
}

function getEmailJsConfig() {
  const {
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY,
  } = process.env;

  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    return null;
  }

  return {
    serviceId: EMAILJS_SERVICE_ID,
    templateId: EMAILJS_TEMPLATE_ID,
    publicKey: EMAILJS_PUBLIC_KEY,
    privateKey: EMAILJS_PRIVATE_KEY,
  };
}

function getTicketUrl(ticketId) {
  const baseUrl = process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/tickets?id=${ticketId}`;
}

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

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function buildNotificationHtml({ subject, text, templateParams = {} }) {
  const appName = process.env.APP_NAME || 'Madison88 ITSM';
  const isCritical = templateParams.is_critical;
  const headerBg = isCritical ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#0f172a,#2563eb)';
  const accentColor = isCritical ? '#dc2626' : '#2563eb';
  const rows = Object.entries(templateParams)
    .filter(([key, value]) => value !== undefined && value !== null && value !== '' && key !== 'ticket_url' && key !== 'is_critical' && key !== 'priority')
    .slice(0, 10)
    .map(([key, value]) => `
      <tr>
        <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:40%">${escapeHtml(key.replace(/_/g, ' '))}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:500">${escapeHtml(String(value))}</td>
      </tr>`)
    .join('');
  const button = templateParams.ticket_url
    ? `<a href="${escapeHtml(templateParams.ticket_url)}" style="display:inline-block;background:${accentColor};color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.3px">View Ticket →</a>`
    : '';
  return `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9">
        <tr><td align="center" style="padding:32px 16px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <!-- Header -->
            <tr><td style="background:${headerBg};padding:28px 32px;color:#ffffff">
              <table role="presentation" width="100%"><tr>
                <td>
                  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.8;margin-bottom:4px">${escapeHtml(appName)}</div>
                  <div style="font-size:22px;font-weight:700;line-height:1.3">${escapeHtml(subject)}</div>
                </td>
              </tr></table>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:32px">
              <div style="font-size:14px;color:#334155;line-height:1.7;white-space:pre-line;margin-bottom:24px">${escapeHtml(text)}</div>
              ${rows ? `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:24px 0">
                <tr><td style="background:#0f172a;padding:12px 16px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Ticket Details</td></tr>
                <tr><td>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
                </td></tr>
              </table>` : ''}
              ${button ? `<div style="text-align:center;margin:32px 0 8px">${button}</div>` : ''}
            </td></tr>
            <!-- Footer -->
            <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
              <div style="font-size:11px;color:#94a3b8;line-height:1.6">
                ${escapeHtml(appName)} Support · This is an automated notification.<br>
                © ${new Date().getFullYear()} Madison88. All rights reserved.
              </div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </div>`;
}

async function sendEmail({ to, subject, text, templateParams = {}, html = null }) {
  if (process.env.NOTIFICATION_QUEUE_ENABLED === 'true' && process.env.NOTIFICATION_WORKER_PROCESSING !== 'true') {
    const { enqueueEmail } = require('./notification-queue.service');
    if (await enqueueEmail({ to, subject, text, templateParams, html })) return true;
  }
  if (!isEmailEnabled()) {
    logger.info('Email notifications disabled. Skipping email.', { subject, to });
    return false;
  }

  const override = process.env.NOTIFICATION_EMAIL_OVERRIDE;
  const finalTo = override && override.trim().length ? override.trim() : to;

  if (override) {
    logger.info('Email override active', { originalTo: to, finalTo });
  }

  const recipientList = String(finalTo || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!recipientList.length) {
    logger.warn('No recipients after normalization', { subject, to: finalTo });
    return false;
  }

  let filteredRecipients = recipientList;
  try {
    const prefRows = await db.query(
      `SELECT u.email, p.email_enabled
       FROM users u
       LEFT JOIN user_notification_preferences p ON p.user_id = u.user_id
       WHERE LOWER(u.email) = ANY($1)`,
      [recipientList.map((r) => r.toLowerCase())]
    );
    const emailOptOut = new Map();
    prefRows.rows.forEach((row) => {
      emailOptOut.set(String(row.email || '').toLowerCase(), row.email_enabled === false);
    });
    filteredRecipients = recipientList.filter((email) => !emailOptOut.get(email.toLowerCase()));
  } catch (err) {
    // If preferences table does not exist yet, continue sending as before.
  }

  if (!filteredRecipients.length) {
    logger.info('All email recipients opted out via preferences', { subject });
    return false;
  }

  html = html || buildNotificationHtml({ subject, text, templateParams });

  const sendSingleEmail = async (recipient) => {
    const emailJsConfig = getEmailJsConfig();
    if (emailJsConfig) {
      logger.info('Sending EmailJS email', {
        to: recipient,
        subject,
        serviceId: emailJsConfig.serviceId,
        templateId: emailJsConfig.templateId,
      });

      const payload = {
        service_id: emailJsConfig.serviceId,
        template_id: emailJsConfig.templateId,
        template_params: {
          to_email: recipient,
          email: recipient,
          subject,
          message: text,
          app_name: process.env.APP_NAME || 'Madison88 ITSM',
          ...templateParams,
        },
      };

      payload.user_id = emailJsConfig.publicKey;
      if (emailJsConfig.privateKey) {
        payload.access_token = emailJsConfig.privateKey;
      }

      try {
        await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload, {
          headers: { 'Content-Type': 'application/json' },
        });
        logger.info('EmailJS send successful', { to: recipient, subject });
        return true;
      } catch (err) {
        logger.error('Failed to send EmailJS email', {
          error: err.message,
          status: err.response?.status,
          data: err.response?.data,
          to: recipient,
          subject,
        });
        return false;
      }
    }

    const brevoKey = process.env.BREVO_API_KEY;
    if (brevoKey) {
      try {
        const brevoRes = await sendViaBrevo({ to: recipient, subject, text, templateParams, html });
        logger.info('Email sent via Brevo HTTP API', { to: recipient, subject, brevoResponse: brevoRes });
        return true;
      } catch (err) {
        logger.error('Brevo API send failed', {
          error: err.message,
          status: err.response?.status,
          data: err.response?.data,
          to: recipient,
          subject,
        });
      }
    }

    const mailer = getTransporter();
    if (!mailer) {
      logger.warn('SMTP not configured and Brevo send failed or not configured. Skipping email.', { subject, to: recipient });
      return false;
    }

    logger.info('Sending SMTP email', { to: recipient, subject });

    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, old_value, new_value, description, ip_address, user_agent, session_id, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          '62530f75-a4d6-4d57-9778-0eae86e00f12',
          'email_sent',
          'notification',
          null,
          null,
          JSON.stringify({ to: recipient, subject, text }),
          `Email sent to ${recipient} with subject '${subject}'`,
          null,
          'mailer',
          null,
        ]
      );
    } catch (auditErr) {
      logger.error('Failed to log email audit', { error: auditErr.message });
    }

    const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    try {
      const mailOptions = { from, to: recipient, subject, text };
      if (html) mailOptions.html = html;
      const info = await mailer.sendMail(mailOptions);
      logger.info('SMTP email sent successfully', { messageId: info.messageId, to: recipient });
      return true;
    } catch (err) {
      logger.error('Failed to send email via SMTP', { error: err.message, to: recipient, subject });
      return false;
    }
  };

  let sentCount = 0;
  for (const recipient of filteredRecipients) {
    // Send separately so recipients never see each other.
    // This prevents end-user email disclosure to other users.
    if (await sendSingleEmail(recipient)) sentCount += 1;
  }

  return sentCount > 0;
}

async function sendEscalationNotice({ ticket, escalation, requester, assignee }) {
  const recipients = collectRecipientEmails([assignee, requester], {
    allowedRoles: STAFF_NOTIFICATION_ROLES,
  });
  if (!recipients.length) return false;

  const ticketUrl = getTicketUrl(ticket.ticket_id);
  const subject = `Ticket Escalated: ${ticket.ticket_number}`;
  const text = [
    `Ticket ${ticket.ticket_number} has been escalated.`,
    `Title: ${ticket.title}`,
    `Severity: ${escalation.severity}`,
    `Reason: ${escalation.reason}`,
    '',
    `View ticket details: ${ticketUrl}`,
  ].join('\n');

  return sendEmail({ to: recipients.join(','), subject, text, templateParams: { ticket_url: ticketUrl } });
}

async function sendSlaEscalationNotice({ ticket, escalation, assignee, leads }) {
  const uniqueRecipients = collectRecipientEmails([assignee, ...(leads || [])], {
    allowedRoles: STAFF_NOTIFICATION_ROLES,
  });
  if (!uniqueRecipients.length) return false;

  const ticketUrl = getTicketUrl(ticket.ticket_id);
  const subject = `SLA Escalation: ${ticket.ticket_number}`;
  const text = [
    `Ticket ${ticket.ticket_number} reached SLA threshold.`,
    `Title: ${ticket.title}`,
    `Priority: ${ticket.priority}`,
    `Severity: ${escalation.severity}`,
    `Reason: ${escalation.reason}`,
    '',
    `View ticket details: ${ticketUrl}`,
  ].join('\n');

  return sendEmail({ to: uniqueRecipients.join(','), subject, text, templateParams: { ticket_url: ticketUrl } });
}

async function sendTicketResolvedNotice({ ticket, requester }) {
  const recipients = collectRecipientEmails([requester]);
  if (!recipients.length) return false;

  const ticketUrl = getTicketUrl(ticket.ticket_id);
  const subject = `Ticket Resolved: ${ticket.ticket_number}`;
  const text = [
    `Your ticket ${ticket.ticket_number} has been resolved.`,
    `Title: ${ticket.title}`,
    `Resolution Summary: ${ticket.resolution_summary || 'No summary provided.'}`,
    `Category: ${ticket.resolution_category || 'Uncategorized'}`,
    `Root Cause: ${ticket.root_cause || 'Not specified'}`,
    '',
    `View details or confirm resolution: ${ticketUrl}`,
  ].join('\n');

  return sendEmail({
    to: recipients.join(','),
    subject,
    text,
    templateParams: {
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      resolution_summary: ticket.resolution_summary || 'No summary provided.',
      resolution_category: ticket.resolution_category || 'Uncategorized',
      root_cause: ticket.root_cause || 'Not specified',
      ticket_url: ticketUrl,
    },
  });
}

function collectRecipientEmails(recipients = [], options = {}) {
  const { allowedRoles = null } = options;
  // Normalize recipients list - can be array of objects with .email or array of strings
  const emails = recipients.map((r) => {
    if (allowedRoles && typeof r === 'object' && r !== null) {
      if (!allowedRoles.includes(r.role)) return null;
    }
    if (typeof r === 'string') return r.trim();
    return r?.email?.trim();
  }).filter(Boolean);

  logger.debug('Normalizing recipients for email collection', { rawCount: recipients.length, emailCount: emails.length });

  // Basic format validation
  const validEmails = emails.filter((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn('Skipping recipient with invalid format', { email });
      return false;
    }
    return true;
  });

  const unique = Array.from(new Set(validEmails));

  if (recipients.length > 0 && unique.length === 0) {
    logger.warn('Email collection resulted in zero valid recipients', { inputCount: recipients.length });
  } else {
    logger.info('Collection complete', { inputCount: recipients.length, validCount: unique.length, recipients: unique });
  }

  return unique;
}

async function sendNewTicketNotice({ ticket, requester, recipients }) {
  // Staff-only distribution for new ticket notice.
  // Do not include requester (end_user) in the same recipient pool.
  const rawRecipients = (recipients || []).map((r) => {
    if (typeof r === 'object' && r !== null && !r.role && r.email) return r.email;
    return r;
  });
  const uniqueRecipients = collectRecipientEmails(rawRecipients, {
    allowedRoles: STAFF_NOTIFICATION_ROLES,
  });
  if (!uniqueRecipients.length) return false;

  const ticketUrl = getTicketUrl(ticket.ticket_id);
  const subject = `New Ticket: ${ticket.ticket_number}`;
  const text = [
    `A new ticket has been created: ${ticket.ticket_number}.`,
    `Title: ${ticket.title}`,
    `Priority: ${ticket.priority}`,
    `Category: ${ticket.category}`,
    requester?.full_name ? `Requester: ${requester.full_name}` : null,
    requester?.email ? `Requester Email: ${requester.email}` : null,
    '',
    `View ticket details: ${ticketUrl}`,
  ].filter(Boolean).join('\n');

  return sendEmail({ to: uniqueRecipients.join(','), subject, text, templateParams: { ticket_url: ticketUrl } });
}

async function sendTicketAssignedNotice({ ticket, assignee, leads = [] }) {
  const recipients = [assignee, ...leads];
  const uniqueRecipients = collectRecipientEmails(recipients);
  if (!uniqueRecipients.length) return false;

  const ticketUrl = getTicketUrl(ticket.ticket_id);
  const subject = `Ticket Assigned: ${ticket.ticket_number} - ${ticket.title}`;
  const text = [
    `Hello,`,
    '',
    `Ticket ${ticket.ticket_number} has been assigned to ${assignee?.full_name || 'an agent'}.`,
    '',
    `Title: ${ticket.title}`,
    `Priority: ${ticket.priority}`,
    `Category: ${ticket.category}`,
    `Location: ${ticket.location}`,
    '',
    `View details: ${ticketUrl}`,
    '',
    `Please log in to the Madison88 ITSM Platform to review the ticket details.`,
  ].filter(Boolean).join('\n');

  return sendEmail({
    to: uniqueRecipients.join(','),
    subject,
    text,
    templateParams: {
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      priority: ticket.priority,
      assignee_name: assignee?.full_name,
      assignee_email: assignee?.email,
      ticket_url: ticketUrl,
    },
  });
}

async function sendTicketReopenedNotice({ ticket, requester, assignee, reopenedBy }) {
  const ticketUrl = getTicketUrl(ticket.ticket_id);
  const subject = `Ticket Reopened: ${ticket.ticket_number}`;
  const text = [
    `Ticket ${ticket.ticket_number} has been reopened.`,
    `Title: ${ticket.title}`,
    `Reopened by: ${reopenedBy?.full_name || reopenedBy?.email || 'User'}`,
    '',
    `View details: ${ticketUrl}`,
    '',
    `Please review the ticket and provide a resolution.`,
  ].join('\n');

  const requesterRecipients = collectRecipientEmails([requester]);
  const staffRecipients = collectRecipientEmails([assignee], {
    allowedRoles: STAFF_NOTIFICATION_ROLES,
  });

  const results = [];
  if (requesterRecipients.length) {
    results.push(sendEmail({ to: requesterRecipients.join(','), subject, text, templateParams: { ticket_url: ticketUrl } }));
  }
  if (staffRecipients.length) {
    results.push(sendEmail({ to: staffRecipients.join(','), subject, text, templateParams: { ticket_url: ticketUrl } }));
  }

  if (!results.length) return false;
  const settled = await Promise.all(results);
  return settled.some(Boolean);
}

async function sendCriticalTicketNotice({ ticket, requester, recipients }) {
  const uniqueRecipients = collectRecipientEmails(recipients, {
    allowedRoles: STAFF_NOTIFICATION_ROLES,
  });
  if (!uniqueRecipients.length) return false;

  const ticketUrl = getTicketUrl(ticket.ticket_id);
  const subject = `🔥 CRITICAL ALERT: ${ticket.ticket_number} - ${ticket.title}`;
  const text = [
    `URGENT: A P1 (Critical) ticket has been opened and requires IMMEDIATE attention.`,
    `--------------------------------------------------`,
    `Ticket ID: ${ticket.ticket_number}`,
    `Subject: ${ticket.title}`,
    `Category: ${ticket.category}`,
    `Location: ${ticket.location}`,
    requester?.full_name ? `Requester: ${requester.full_name}` : null,
    `--------------------------------------------------`,
    `View details: ${ticketUrl}`,
    `--------------------------------------------------`,
    `Description:`,
    ticket.description,
    `--------------------------------------------------`,
    `Please log in to the Madison88 ITSM Platform to begin resolution.`,
  ].filter(Boolean).join('\n');

  return sendEmail({
    to: uniqueRecipients.join(','),
    subject,
    text,
    templateParams: {
      is_critical: true,
      priority: 'P1',
      ticket_url: ticketUrl,
    }
  });
}

async function sendWelcomeNotice({ user }) {
  if (!user?.email) return false;

  const appName = process.env.APP_NAME || 'Madison88 ITSM';
  const loginUrl = process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL || 'the portal';
  const subject = `Welcome to ${appName}`;
  const text = `Hello ${user.full_name || 'there'},

Welcome to the Madison88 IT Service Management Platform! Your account has been successfully created.

You can now log in to the platform at: ${loginUrl}

Through the portal, you can:
- Create new IT Support tickets
- Track the status of your requests
- View company announcements

If you have any questions, feel free to contact the IT support team.

Best regards,
${process.env.SMTP_FROM_NAME || 'Madison88 Support Team'}`;

  const html = `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9">
        <tr><td align="center" style="padding:32px 16px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <tr><td style="background:linear-gradient(135deg,#059669,#10b981);padding:32px;text-align:center;color:#fff">
              <div style="font-size:48px;margin-bottom:12px">👋</div>
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;margin-bottom:4px">${escapeHtml(appName)}</div>
              <div style="font-size:24px;font-weight:700">Welcome, ${escapeHtml(user.full_name || 'there')}!</div>
            </td></tr>
            <tr><td style="padding:32px">
              <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 20px">Your account has been successfully created. You can now access the Madison88 IT Service Management Platform.</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0">
                <div style="font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">You can now:</div>
                <div style="font-size:14px;color:#334155;line-height:2">
                  🎫 Create new IT Support tickets<br>
                  📊 Track the status of your requests<br>
                  📢 View company announcements
                </div>
              </div>
              <div style="text-align:center;margin:32px 0 8px">
                <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#059669;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.3px">Log In to ITSM →</a>
              </div>
              <p style="font-size:13px;color:#94a3b8;text-align:center;margin:24px 0 0">If you have any questions, feel free to contact the IT support team.</p>
            </td></tr>
            <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
              <div style="font-size:11px;color:#94a3b8;line-height:1.6">
                ${escapeHtml(appName)} Support · This is an automated notification.<br>
                © ${new Date().getFullYear()} Madison88. All rights reserved.
              </div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </div>`;

  return sendEmail({
    to: user.email,
    subject,
    text,
    html,
    templateParams: {
      user_name: user.full_name,
      welcome_link: loginUrl,
    },
  });
}

async function sendPasswordResetNotice({ user, temporaryPassword, token }) {
  if (!user?.email) return false;

  const appName = process.env.APP_NAME || 'Madison88 ITSM';

  if (token) {
    const frontendBase = (process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetLink = `${frontendBase}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = `Security: Password Reset for ${appName}`;
    const text = [
      `Hello ${user.full_name || 'user'},`,
      '',
      `A request to reset your password was received. If you initiated this request, open the link below to set a new password. This link will expire in 24 hours.`,
      '',
      `${resetLink}`,
      '',
      `If you did not request this, please contact IT support immediately.`,
      '',
      `Best regards,`,
      `${process.env.SMTP_FROM_NAME || 'Madison88 Support Team'}`,
    ].join('\n');

    // HTML template with CTA button (inline styles for email clients)
    const html = `
      <div style="font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#0b1220; background:#f7fafc; padding:24px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e6eef8;">
          <div style="padding:20px 24px;background:linear-gradient(90deg,#0ea5e9,#6366f1);color:#fff">
            <h2 style="margin:0;font-size:18px;">${appName}</h2>
          </div>
          <div style="padding:20px 24px;">
            <p style="margin:0 0 12px 0;color:#0f172a;font-size:16px;">Hello ${user.full_name || 'there'},</p>
            <p style="color:#334155; margin:0 0 16px 0;font-size:14px;">We received a request to reset your password. Click the button below to set a new password. This link will expire in 24 hours.</p>
            <div style="text-align:center; margin: 20px 0;">
              <a href="${resetLink}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:linear-gradient(90deg,#0ea5e9,#6366f1);color:#fff;text-decoration:none;font-weight:700;font-size:14px;">
                Reset Password
              </a>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin-top:16px;">If the button doesn't work, copy and paste this URL into your browser:</p>
            <pre style="white-space:pre-wrap;word-wrap:break-word;color:#0f172a;background:#f1f5f9;padding:10px;border-radius:6px;overflow:auto;font-size:12px;">${resetLink}</pre>
            <p style="color:#94a3b8;font-size:12px;margin-top:12px;">If you did not request this, please contact IT support immediately.</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:12px;">Best regards,<br/>${process.env.SMTP_FROM_NAME || 'Madison88 Support Team'}</p>
          </div>
          <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e6eef8;text-align:center;font-size:11px;color:#94a3b8;">
            <p style="margin:0;">© 2026 ${appName}. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    return sendEmail({
      to: user.email,
      subject,
      text,
      html,
      templateParams: {
        user_name: user.full_name,
        reset_link: resetLink,
      },
    });
  }

  // Backwards-compatible: temporary password flow
  if (temporaryPassword) {
    const subject = `Security: Temporary Password for ${appName}`;
    const loginUrl = process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL || 'the portal';
    const text = `Hello ${user.full_name},

A temporary password has been generated for your account.

Temporary Password: ${temporaryPassword}

Please log in using the link below and change your password immediately upon entry.
${loginUrl}

Security Tip: Never share your password with anyone, including IT Support.

Best regards,
${process.env.SMTP_FROM_NAME || 'Madison88 Support Team'}`;

    const html = `
      <div style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9">
          <tr><td align="center" style="padding:32px 16px">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
              <tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center;color:#fff">
                <div style="font-size:48px;margin-bottom:12px">🔐</div>
                <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;margin-bottom:4px">${escapeHtml(appName)}</div>
                <div style="font-size:24px;font-weight:700">Temporary Password</div>
              </td></tr>
              <tr><td style="padding:32px">
                <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 20px">Hello ${escapeHtml(user.full_name)},</p>
                <p style="font-size:14px;color:#334155;line-height:1.7;margin:0 0 20px">A temporary password has been generated for your account. Please use it to log in and change your password immediately.</p>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;text-align:center;margin:24px 0">
                  <div style="font-size:11px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Your Temporary Password</div>
                  <div style="font-size:28px;font-weight:800;color:#0f172a;font-family:'Courier New',monospace;letter-spacing:3px;padding:8px 0">${escapeHtml(temporaryPassword)}</div>
                </div>
                <div style="text-align:center;margin:32px 0 8px">
                  <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#d97706;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.3px">Log In Now →</a>
                </div>
                <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:24px 0">
                  <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6">⚠️ <strong>Security Tip:</strong> Never share your password with anyone, including IT Support. Change this temporary password immediately after logging in.</p>
                </div>
              </td></tr>
              <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
                <div style="font-size:11px;color:#94a3b8;line-height:1.6">
                  ${escapeHtml(appName)} Support · This is an automated notification.<br>
                  © ${new Date().getFullYear()} Madison88. All rights reserved.
                </div>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </div>`;

    return sendEmail({
      to: user.email,
      subject,
      text,
      html,
      templateParams: {
        user_name: user.full_name,
        temp_password: temporaryPassword,
      },
    });
  }

  return false;
}

/**
 * Send email via Brevo (HTTP API) fallback. Requires `BREVO_API_KEY` env var.
 */
async function sendViaBrevo({ to, subject, text, templateParams = {}, html = null }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');

  const sender = {
    name: process.env.SMTP_FROM_NAME || 'Madison88 Support Team',
    email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@madison88.local',
  };

  const recipients = (to || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(email => ({ email }));

  if (!recipients.length) throw new Error('No recipients for Brevo send');

  const payload = {
    sender,
    to: recipients,
    subject,
    textContent: text,
    htmlContent: html || (text || '').replace(/\n/g, '<br/>'),
  };

  // Force IPv4 to avoid Brevo rejecting IPv6 addresses
  const ipv4Agent = new https.Agent({ family: 4 });

  const res = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    timeout: 10000,
    httpsAgent: ipv4Agent,
  });

  return res.data;
}

module.exports = {
  sendEmail,
  sendEscalationNotice,
  sendSlaEscalationNotice,
  sendTicketResolvedNotice,
  sendNewTicketNotice,
  sendTicketAssignedNotice,
  sendTicketReopenedNotice,
  sendCriticalTicketNotice,
  sendWelcomeNotice,
  sendPasswordResetNotice,
};
