export const TICKET_STATUSES = Object.freeze([
  "New",
  "In Progress",
  "Resolved",
  "Closed",
]);

export const STATUS_ALIASES = Object.freeze({
  Pending: "In Progress",
  Reopened: "In Progress",
});

export const normalizeTicketStatus = (status) =>
  STATUS_ALIASES[status] || status;

export const normalizeStatusFilter = (value) =>
  String(value || "")
    .split(",")
    .map((status) => normalizeTicketStatus(status.trim()))
    .filter((status, index, all) => TICKET_STATUSES.includes(status) && all.indexOf(status) === index)
    .join(",");
