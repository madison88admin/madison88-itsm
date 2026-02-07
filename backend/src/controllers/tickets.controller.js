const TicketsService = require('../services/tickets.service');

const TicketsController = {
  async createTicket(req, res, next) {
    try {
      const result = await TicketsService.createTicket({
        payload: req.body,
        user: req.user,
        meta: {
          ip: req.ip,
          userAgent: req.headers['user-agent'] || '',
          sessionId: req.headers['x-session-id'] || null,
        },
      });
      res.status(201).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },

  async listTickets(req, res, next) {
    try {
      const result = await TicketsService.listTickets({
        query: req.query,
        user: req.user,
      });
      res.json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },

  async getTicket(req, res, next) {
    try {
      const result = await TicketsService.getTicketDetails({
        ticketId: req.params.id,
        user: req.user,
      });
      res.json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },

  async updateTicket(req, res, next) {
    try {
      const result = await TicketsService.updateTicket({
        ticketId: req.params.id,
        payload: req.body,
        user: req.user,
        meta: {
          ip: req.ip,
          userAgent: req.headers['user-agent'] || '',
          sessionId: req.headers['x-session-id'] || null,
        },
      });
      res.json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },

  async addComment(req, res, next) {
    try {
      const result = await TicketsService.addComment({
        ticketId: req.params.id,
        payload: req.body,
        user: req.user,
        meta: {
          ip: req.ip,
          userAgent: req.headers['user-agent'] || '',
          sessionId: req.headers['x-session-id'] || null,
        },
      });
      res.status(201).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },

  async addAttachments(req, res, next) {
    try {
      const result = await TicketsService.addAttachments({
        ticketId: req.params.id,
        files: req.files || [],
        user: req.user,
        meta: {
          ip: req.ip,
          userAgent: req.headers['user-agent'] || '',
          sessionId: req.headers['x-session-id'] || null,
        },
      });
      res.status(201).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },

  async getAuditLog(req, res, next) {
    try {
      const result = await TicketsService.getAuditLog({
        ticketId: req.params.id,
        user: req.user,
      });
      res.json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },

  async listPriorityOverrideRequests(req, res, next) {
    try {
      const requests = await TicketsService.listPriorityOverrideRequests({
        ticketId: req.params.id,
        user: req.user,
      });
      res.json({ status: 'success', data: { requests } });
    } catch (err) {
      next(err);
    }
  },

  async requestPriorityOverride(req, res, next) {
    try {
      const result = await TicketsService.requestPriorityOverride({
        ticketId: req.params.id,
        payload: req.body,
        user: req.user,
        meta: {
          ip: req.ip,
          userAgent: req.headers['user-agent'] || '',
          sessionId: req.headers['x-session-id'] || null,
        },
      });
      res.status(201).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },

  async reviewPriorityOverride(req, res, next) {
    try {
      const result = await TicketsService.reviewPriorityOverride({
        ticketId: req.params.id,
        requestId: req.params.requestId,
        payload: req.body,
        user: req.user,
        meta: {
          ip: req.ip,
          userAgent: req.headers['user-agent'] || '',
          sessionId: req.headers['x-session-id'] || null,
        },
      });
      res.json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = TicketsController;
