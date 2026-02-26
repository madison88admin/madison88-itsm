/**
 * Tickets Routes
 * POST /api/tickets - Create ticket
 * GET /api/tickets - List tickets
 * GET /api/tickets/:id - Get ticket details
 * PATCH /api/tickets/:id - Update ticket
 * POST /api/tickets/:id/comments - Add comment
 * POST /api/tickets/:id/attachments - Upload attachment
 * GET /api/tickets/:id/audit-log - Get audit trail
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const TicketsController = require('../controllers/tickets.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const router = express.Router();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateId = (req, res, next) => {
  if (req.params.id && !uuidRegex.test(req.params.id)) {
    return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
  }
  next();
};

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// --- Rate Limiting for Ticket Creation ---
const ticketRateLimitMap = new Map();
const TICKET_RATE_LIMIT = 5;        // max tickets
const TICKET_RATE_WINDOW = 15 * 60 * 1000; // per 15 minutes

const ticketRateLimiter = (req, res, next) => {
  // IT staff are exempt
  if (['it_agent', 'it_manager', 'system_admin'].includes(req.user?.role)) return next();
  const userId = req.user?.user_id;
  if (!userId) return next();

  const now = Date.now();
  const entry = ticketRateLimitMap.get(userId) || { timestamps: [] };
  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter(t => now - t < TICKET_RATE_WINDOW);

  if (entry.timestamps.length >= TICKET_RATE_LIMIT) {
    return res.status(429).json({
      status: 'error',
      message: `You can only create ${TICKET_RATE_LIMIT} tickets every 15 minutes. Please try again later.`,
    });
  }
  entry.timestamps.push(now);
  ticketRateLimitMap.set(userId, entry);
  next();
};

/**
 * @route POST /api/tickets
 * @desc Create a new ticket (JSON body)
 */
router.post('/', authenticate, authorize(['end_user']), ticketRateLimiter, TicketsController.createTicket);

/**
 * @route POST /api/tickets/with-attachments
 * @desc Create a new ticket with attachments in one request (multipart/form-data). Use to avoid orphan tickets if attachment upload fails.
 */
router.post('/with-attachments', authenticate, authorize(['end_user']), ticketRateLimiter, upload.array('files', 5), TicketsController.createTicketWithAttachments);

/**
 * @route GET /api/tickets/check-duplicates
 * @desc Check for potential duplicate tickets in real-time
 */
router.get('/check-duplicates', authenticate, TicketsController.checkDuplicates);

/**
 * @route GET /api/tickets/sla-preview
 * @desc Preview SLA targets based on current form inputs
 */
router.get('/sla-preview', authenticate, TicketsController.previewSla);

/**
 * @route GET /api/tickets
 * @desc List all tickets with filters
 */
router.get('/', authenticate, TicketsController.listTickets);

/**
 * @route POST /api/tickets/bulk-assign
 * @desc Bulk assign tickets
 */
router.post('/bulk-assign', authenticate, TicketsController.bulkAssign);

/**
 * @route POST /api/tickets/:id/confirm-resolution
 * @desc User confirms ticket resolution
 */
router.post('/:id/confirm-resolution', authenticate, validateId, TicketsController.confirmResolution);

/**
 * @route POST /api/tickets/:id/reopen
 * @desc Reopen a resolved/closed ticket
 */
router.post('/:id/reopen', authenticate, validateId, TicketsController.reopenTicket);

/**
 * @route GET /api/tickets/:id/status-history
 * @desc Get ticket status history
 */
router.get('/:id/status-history', authenticate, validateId, TicketsController.getStatusHistory);

/**
 * @route GET /api/tickets/:id/priority-override-requests
 * @desc List priority override requests
 */
router.get('/:id/priority-override-requests', authenticate, validateId, TicketsController.listPriorityOverrideRequests);

/**
 * @route POST /api/tickets/:id/priority-override-requests
 * @desc Request priority override
 */
router.post('/:id/priority-override-requests', authenticate, validateId, TicketsController.requestPriorityOverride);

/**
 * @route PATCH /api/tickets/:id/priority-override-requests/:requestId
 * @desc Approve/reject priority override
 */
router.patch('/:id/priority-override-requests/:requestId', authenticate, validateId, TicketsController.reviewPriorityOverride);

/**
 * @route GET /api/tickets/:id/comments
 * @desc Get ticket comments
 */
router.get('/:id/comments', authenticate, validateId, TicketsController.getComments);

/**
 * @route POST /api/tickets/:id/comments
 * @desc Add comment to ticket (supports image attachments via multipart/form-data)
 */
router.post('/:id/comments', authenticate, validateId, upload.array('images', 5), TicketsController.addComment);

/**
 * @route POST /api/tickets/:id/attachments
 * @desc Upload attachment to ticket
 */
router.post('/:id/attachments', authenticate, validateId, upload.array('files', 5), TicketsController.addAttachments);

/**
 * @route GET /api/tickets/:id/escalations
 * @desc List ticket escalations
 */
router.get('/:id/escalations', authenticate, validateId, TicketsController.listEscalations);

/**
 * @route POST /api/tickets/:id/escalations
 * @desc Create ticket escalation
 */
router.post('/:id/escalations', authenticate, validateId, TicketsController.createEscalation);

/**
 * @route GET /api/tickets/:id/audit-log
 * @desc Get ticket audit trail
 */
router.get('/:id/audit-log', authenticate, validateId, authorize(['system_admin', 'it_manager', 'it_agent']), TicketsController.getAuditLog);

/**
 * @route GET /api/tickets/:id
 * @desc Get single ticket details
 */
router.get('/:id', authenticate, validateId, TicketsController.getTicket);

/**
 * @route PATCH /api/tickets/:id
 * @desc Update ticket
 */
router.patch('/:id', authenticate, validateId, TicketsController.updateTicket);

module.exports = router;
