const axios = require('axios');
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

async function sendEmail({ to, subject, text, templateParams = {}, html = null }) {
  if (!isEmailEnabled()) {
    logger.info('Email notifications disabled. Skipping email.', { subject, to });
    return false;
  }

  const override = process.env.NOTIFICATION_EMAIL_OVERRIDE;
  const finalTo = override && override.trim().length ? override.trim() : to;

  if (override) {
    logger.info('Email override active', { originalTo: to, finalTo });
  }

  const emailJsConfig = getEmailJsConfig();
  if (emailJsConfig) {
    if (!finalTo || !finalTo.trim()) {
      logger.error('EmailJS recipient is empty. Skipping send.', { subject });
      return false;
    }

    logger.info('Sending EmailJS email', {
      to: finalTo,
      subject,
      serviceId: emailJsConfig.serviceId,
      templateId: emailJsConfig.templateId,
    });

    const payload = {
      service_id: emailJsConfig.serviceId,
      template_id: emailJsConfig.templateId,
      template_params: {
        to_email: finalTo,
        email: finalTo,
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
      logger.info('EmailJS send successful', { to: finalTo, subject });
      return true;
    } catch (err) {
      logger.error('Failed to send EmailJS email', {
        error: err.message,
        status: err.response?.status,
        data: err.response?.data,
        to: finalTo,
        subject,
      });
      return false;
    }
  }

  // Prefer Brevo HTTP API when configured; fall back to SMTP if Brevo fails
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    try {
      const brevoRes = await sendViaBrevo({ to: finalTo, subject, text, templateParams, html });
      logger.info('Email sent via Brevo HTTP API', { to: finalTo, subject, brevoResponse: brevoRes });
      return true;
    } catch (err) {
      logger.error('Brevo API send failed', {
        error: err.message,
        status: err.response?.status,
        data: err.response?.data,
        to: finalTo,
        subject,
      });
      // If SMTP is not configured, we will return false below.
      // Otherwise, fall through to attempt SMTP send as a backup.
    }
  }

  const mailer = getTransporter();
  if (!mailer) {
    logger.warn('SMTP not configured and Brevo send failed or not configured. Skipping email.', { subject, to });
    return false;
  }

  logger.info('Sending SMTP email', { to: finalTo, subject });

  // Audit log for sent email
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, old_value, new_value, description, ip_address, user_agent, session_id, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        '62530f75-a4d6-4d57-9778-0eae86e00f12', // Fallback System Admin ID
        'email_sent',
        'notification',
        null,
        null,
        JSON.stringify({ to: finalTo, subject, text }),
        `Email sent to ${finalTo} with subject '${subject}'`,
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
    const mailOptions = { from, to: finalTo, subject, text };
    if (html) mailOptions.html = html;
    const info = await mailer.sendMail(mailOptions);
    logger.info('SMTP email sent successfully', { messageId: info.messageId, to: finalTo });
    return true;
  } catch (err) {
    logger.error('Failed to send email via SMTP', { error: err.message, to: finalTo, subject });
    return false;
  }
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
  const allRecipients = [...(recipients || [])];
  if (requester?.email) {
    allRecipients.push(requester.email);
  }

  const uniqueRecipients = collectRecipientEmails(allRecipients);
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
  const recipients = collectRecipientEmails([requester, assignee]);
  if (!recipients.length) return false;

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

  return sendEmail({ to: recipients.join(','), subject, text, templateParams: { ticket_url: ticketUrl } });
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

  const subject = `Welcome to ${process.env.APP_NAME || 'Madison88 ITSM'}`;
  const text = [
    `Hello ${user.full_name || 'there'},`,
    '',
    `Welcome to the Madison88 IT Service Management Platform! Your account has been successfully created.`,
    '',
    `You can now log in to the platform at: ${process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL || 'the portal'}`,
    '',
    `Through the portal, you can:`,
    `- Create new IT Support tickets`,
    `- Track the status of your requests`,
    `- View company announcements`,
    '',
    `If you have any questions, feel free to contact the IT support team.`,
    '',
    `Best regards,`,
    `${process.env.SMTP_FROM_NAME || 'Madison88 Support Team'}`,
  ].join('\n');

  return sendEmail({
    to: user.email,
    subject,
    text,
    templateParams: {
      user_name: user.full_name,
      welcome_link: process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL,
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
    const text = [
      `Hello ${user.full_name},`,
      '',
      `A temporary password has been generated for your account.`,
      '',
      `Temporary Password: ${temporaryPassword}`,
      '',
      `Please log in using the link below and change your password immediately upon entry.`,
      `${process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL || 'the portal'}`,
      '',
      `Security Tip: Never share your password with anyone, including IT Support.`,
      '',
      `Best regards,`,
      `${process.env.SMTP_FROM_NAME || 'Madison88 Support Team'}`,
    ].join('\n');

    return sendEmail({
      to: user.email,
      subject,
      text,
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

  const res = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    timeout: 10000,
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
