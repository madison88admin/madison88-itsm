const { TICKET_STATUSES, canonicalStatus } = require('../ticket-status');

describe('ticket status rollout', () => {
  test('exposes four canonical statuses and maps legacy values', () => {
    expect(TICKET_STATUSES).toEqual(['New', 'In Progress', 'Resolved', 'Closed']);
    expect(canonicalStatus('Pending')).toBe('In Progress');
    expect(canonicalStatus('Reopened')).toBe('In Progress');
  });
});
