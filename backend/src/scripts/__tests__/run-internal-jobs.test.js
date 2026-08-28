jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));
jest.mock('../../services/tickets.service', () => ({
  runSlaEscalations: jest.fn().mockResolvedValue({ escalated: 0 }),
  runAutoClosePendingConfirmation: jest.fn().mockResolvedValue({ closed: 0 }),
  runAutoCloseResolvedTickets: jest.fn().mockResolvedValue({ closed: 0 }),
}));
jest.mock('../../config/database', () => ({ end: jest.fn().mockResolvedValue(undefined) }));

const TicketsService = require('../../services/tickets.service');

describe('scheduled ITSM jobs', () => {
  test('runs SLA escalation and both auto-close passes once', async () => {
    jest.isolateModules(() => {
      require('../run-internal-jobs');
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(TicketsService.runSlaEscalations).toHaveBeenCalledWith({
      thresholdPercent: 90,
      statuses: ['New', 'In Progress', 'Pending'],
    });
    expect(TicketsService.runAutoClosePendingConfirmation).toHaveBeenCalledWith({ days: 2 });
    expect(TicketsService.runAutoCloseResolvedTickets).toHaveBeenCalledWith({ businessDays: 3 });
  });
});
