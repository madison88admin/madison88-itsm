const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message' });
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({ createTransport: mockCreateTransport }));
jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

describe('notification behavior', () => {
  let NotificationService;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.ENABLE_EMAIL_NOTIFICATIONS = 'true';
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'sender@test';
    process.env.SMTP_PASSWORD = 'secret';
    process.env.SMTP_FROM_EMAIL = 'sender@test';
    delete process.env.NOTIFICATION_EMAIL_OVERRIDE;
    NotificationService = require('../notification.service');
  });

  test('does not send a new-ticket notice when there are no valid staff recipients', async () => {
    await expect(NotificationService.sendNewTicketNotice({
      ticket: { ticket_id: 'ticket-1', ticket_number: 'M88-1', title: 'Test', priority: 'P3', category: 'Software' },
      recipients: [{ email: 'requester@test', role: 'end_user' }],
    })).resolves.toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test('sends staff notification through SMTP and excludes end-user recipients', async () => {
    await expect(NotificationService.sendNewTicketNotice({
      ticket: { ticket_id: 'ticket-1', ticket_number: 'M88-1', title: 'Test', priority: 'P3', category: 'Software' },
      requester: { email: 'requester@test', full_name: 'Requester' },
      recipients: [
        { email: 'agent@example.com', role: 'it_agent' },
        { email: 'requester@example.com', role: 'end_user' },
      ],
    })).resolves.toBe(true);

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'agent@example.com',
      subject: 'New Ticket: M88-1',
    }));
    expect(mockSendMail.mock.calls[0][0].to).not.toContain('requester@example.com');
  });

  test('returns false when email notifications are disabled', async () => {
    process.env.ENABLE_EMAIL_NOTIFICATIONS = 'false';
    await expect(NotificationService.sendEmail({ to: 'agent@test', subject: 'Test', text: 'Test' }))
      .resolves.toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
