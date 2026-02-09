#!/usr/bin/env node

/**
 * Madison88 ITSM Backend Server
 * Main entry point for the application
 */

const app = require('./app');
const http = require('http');
const socketIo = require('socket.io');
const logger = require('./utils/logger');
const TicketsService = require('./services/tickets.service');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Initialize Socket.io for real-time notifications
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });

  socket.on('subscribe-ticket', (ticketId) => {
    socket.join(`ticket-${ticketId}`);
    logger.info(`User subscribed to ticket ${ticketId}`);
  });

  socket.on('unsubscribe-ticket', (ticketId) => {
    socket.leave(`ticket-${ticketId}`);
  });
});

// Attach io to app for use in routes
app.set('io', io);

server.listen(PORT, () => {
  logger.info(`🚀 Madison88 ITSM Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

let slaJobRunning = false;
const SLA_ESCALATION_INTERVAL_MINUTES = Number(process.env.SLA_ESCALATION_INTERVAL_MINUTES || 5);
const SLA_ESCALATION_THRESHOLD_PERCENT = Number(process.env.SLA_ESCALATION_THRESHOLD_PERCENT || 90);
const SLA_ESCALATION_STATUSES = ['New', 'In Progress', 'Pending'];

async function runSlaEscalationJob() {
  if (slaJobRunning) return;
  slaJobRunning = true;
  try {
    const result = await TicketsService.runSlaEscalations({
      thresholdPercent: SLA_ESCALATION_THRESHOLD_PERCENT,
      statuses: SLA_ESCALATION_STATUSES,
    });
    if (result.escalated) {
      logger.info(`SLA auto-escalations created: ${result.escalated}`);
    }
  } catch (err) {
    logger.error('SLA auto-escalation job failed', { error: err.message });
  } finally {
    slaJobRunning = false;
  }
}

setInterval(runSlaEscalationJob, SLA_ESCALATION_INTERVAL_MINUTES * 60 * 1000);
runSlaEscalationJob();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});
