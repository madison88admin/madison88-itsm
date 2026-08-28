jest.mock('../../models/user.model', () => ({}));
jest.mock('../../models/tickets.model', () => ({}));
jest.mock('../../models/assets.model', () => ({}));
jest.mock('../../models/sla.model', () => ({}));
jest.mock('../../models/priority-override.model', () => ({}));
jest.mock('../notification.service', () => ({}));
jest.mock('../../models/notifications.model', () => ({}));
jest.mock('../../config/database', () => ({ query: jest.fn() }));

const TicketsService = require('../tickets.service');

describe('Ticket creation workflow', () => {
  test('JSON ticket creation delegates to the unified attachment-capable workflow', async () => {
    const unified = jest.spyOn(TicketsService, 'createTicketWithAttachments')
      .mockResolvedValue({ ticket: { ticket_id: 'ticket-1' } });

    const payload = { title: 'VPN issue', description: 'Cannot connect', category: 'Software' };
    const user = { user_id: 'user-1', role: 'end_user' };
    const meta = { ip: '127.0.0.1' };

    await expect(TicketsService.createTicket({ payload, user, meta }))
      .resolves.toEqual({ ticket: { ticket_id: 'ticket-1' } });
    expect(unified).toHaveBeenCalledWith({ payload, files: [], user, meta });
  });
});
