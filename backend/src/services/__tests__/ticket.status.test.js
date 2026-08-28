jest.mock('../../models/tickets.model', () => ({
  getTicketById: jest.fn(),
  updateTicket: jest.fn(),
  createAuditLog: jest.fn().mockResolvedValue(undefined),
  createStatusHistory: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../models/user.model', () => ({
  findById: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../models/assets.model', () => ({}));
jest.mock('../../models/sla.model', () => ({}));
jest.mock('../../models/priority-override.model', () => ({}));
jest.mock('../../models/notifications.model', () => ({ createNotification: jest.fn() }));
jest.mock('../notification.service', () => ({ sendTicketReopenedNotice: jest.fn().mockResolvedValue(true) }));
jest.mock('../../config/database', () => ({ query: jest.fn() }));

const TicketsService = require('../tickets.service');
const TicketsModel = require('../../models/tickets.model');
const NotificationsModel = require('../../models/notifications.model');

const requester = { user_id: 'user-1', role: 'end_user' };
const agent = { user_id: 'agent-1', role: 'it_agent' };

describe('ticket resolution and reopen behavior', () => {
  beforeEach(() => jest.clearAllMocks());

  test('only the requester can confirm a resolved ticket', async () => {
    TicketsModel.getTicketById.mockResolvedValue({
      ticket_id: 'ticket-1', user_id: 'user-1', status: 'Resolved',
      user_confirmed_resolution: false, assigned_to: 'agent-1',
    });
    TicketsModel.updateTicket.mockResolvedValue({
      ticket_id: 'ticket-1', status: 'Resolved', assigned_to: 'agent-1',
      ticket_number: 'M88-1', title: 'VPN issue', user_confirmed_resolution: true,
    });

    await expect(TicketsService.confirmTicketResolution({ ticketId: 'ticket-1', user: requester }))
      .resolves.toEqual(expect.objectContaining({ ticket: expect.objectContaining({ user_confirmed_resolution: true }) }));
    expect(NotificationsModel.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'agent-1', type: 'ticket_confirmed',
    }));

    await expect(TicketsService.confirmTicketResolution({
      ticketId: 'ticket-1', user: { user_id: 'other-user', role: 'end_user' },
    })).rejects.toThrow('Only the ticket requester can confirm resolution');
  });

  test('rejects confirmation for an open ticket', async () => {
    TicketsModel.getTicketById.mockResolvedValue({ ticket_id: 'ticket-1', user_id: 'user-1', status: 'In Progress' });
    await expect(TicketsService.confirmTicketResolution({ ticketId: 'ticket-1', user: requester }))
      .rejects.toThrow('Ticket must be Resolved or Closed to confirm');
  });

  test('requires a reason and allows requester or staff to reopen resolved tickets', async () => {
    TicketsModel.getTicketById.mockResolvedValue({
      ticket_id: 'ticket-1', user_id: 'user-1', status: 'Resolved', reopened_count: 0,
    });
    await expect(TicketsService.reopenTicket({ ticketId: 'ticket-1', user: requester, reason: ' ' }))
      .rejects.toThrow('Reason is required for reopening a ticket');

    TicketsModel.updateTicket.mockResolvedValue({ ticket_id: 'ticket-1', status: 'Reopened', reopened_count: 1 });
    await expect(TicketsService.reopenTicket({ ticketId: 'ticket-1', user: agent, reason: 'Still failing' }))
      .resolves.toEqual(expect.objectContaining({ ticket: expect.objectContaining({ status: 'Reopened' }) }));
    expect(TicketsModel.updateTicket).toHaveBeenCalledWith('ticket-1', expect.objectContaining({
      status: 'Reopened', reopened_count: 1, is_archived: false,
    }));
  });
});
