/**
 * One-shot scheduler entry point for VPS cron/systemd.
 * Keep this separate from the web process so multiple API instances do not
 * execute the same SLA/auto-close work concurrently.
 */

require('dotenv').config();
const logger = require('../utils/logger');
const TicketsService = require('../services/tickets.service');

async function run() {
  const result = {};

  if (process.env.RUN_SLA_JOB !== 'false') {
    result.sla = await TicketsService.runSlaEscalations({
      thresholdPercent: Number(process.env.SLA_ESCALATION_THRESHOLD_PERCENT || 90),
      statuses: ['New', 'In Progress', 'Pending'],
    });
  }

  if (process.env.RUN_AUTO_CLOSE_JOB !== 'false') {
    const pending = await TicketsService.runAutoClosePendingConfirmation({ days: 2 });
    const resolved = await TicketsService.runAutoCloseResolvedTickets({
      businessDays: Number(process.env.AUTO_CLOSE_BUSINESS_DAYS || 3),
    });
    result.auto_close = { pending, resolved };
  }

  logger.info('Scheduled ITSM jobs completed', result);
}

run()
  .catch((err) => {
    logger.error('Scheduled ITSM jobs failed', { error: err.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    const db = require('../config/database');
    await db.end();
  });
