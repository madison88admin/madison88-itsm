const TICKET_STATUSES = Object.freeze(['New', 'In Progress', 'Resolved', 'Closed']);
const LEGACY_STATUS_MAP = Object.freeze({ Pending: 'In Progress', Reopened: 'In Progress' });

function canonicalStatus(status) {
  return LEGACY_STATUS_MAP[status] || status;
}

function isCanonicalStatus(status) {
  return TICKET_STATUSES.includes(status);
}

module.exports = { TICKET_STATUSES, LEGACY_STATUS_MAP, canonicalStatus, isCanonicalStatus };
