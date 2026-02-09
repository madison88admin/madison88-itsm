const axios = require('axios');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

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

async function sendEmail({ to, subject, text, templateParams = {} }) {
  if (!isEmailEnabled()) {
    logger.info('Email notifications disabled. Skipping email.', { subject, to });
    return false;
  }

  const override = process.env.NOTIFICATION_EMAIL_OVERRIDE;
  const finalTo = override && override.trim().length ? override.trim() : to;

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

  const mailer = getTransporter();
  if (!mailer) {
    logger.warn('SMTP not configured. Skipping email.', { subject, to });
    return false;
  }

  const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  try {
    await mailer.sendMail({ from, to: finalTo, subject, text });
    return true;
  } catch (err) {
    logger.error('Failed to send email', { error: err.message, to: finalTo, subject });
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

async function sendTicketResolvedNotice({ ticket, requester }) {
  if (!requester?.email) return false;

  const subject = `Ticket Resolved: ${ticket.ticket_number}`;
  const text = [
    `Your ticket ${ticket.ticket_number} has been resolved.`,
    `Title: ${ticket.title}`,
    `Resolution Summary: ${ticket.resolution_summary || 'No summary provided.'}`,
    `Category: ${ticket.resolution_category || 'Uncategorized'}`,
    `Root Cause: ${ticket.root_cause || 'Not specified'}`,
  ].join('\n');

  return sendEmail({
    to: requester.email,
    subject,
    text,
    templateParams: {
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      resolution_summary: ticket.resolution_summary || 'No summary provided.',
      resolution_category: ticket.resolution_category || 'Uncategorized',
      root_cause: ticket.root_cause || 'Not specified',
    },
  });
}

module.exports = {
  sendEmail,
  sendEscalationNotice,
  sendSlaEscalationNotice,
  sendTicketResolvedNotice,
};
