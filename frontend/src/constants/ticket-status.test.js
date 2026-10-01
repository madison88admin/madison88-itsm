import {
  TICKET_STATUSES,
  normalizeStatusFilter,
  normalizeTicketStatus,
} from "./ticket-status";

test("exposes only the four canonical ticket statuses", () => {
  expect(TICKET_STATUSES).toEqual(["New", "In Progress", "Resolved", "Closed"]);
});

test("normalizes legacy statuses before they reach UI filters", () => {
  expect(normalizeTicketStatus("Pending")).toBe("In Progress");
  expect(normalizeTicketStatus("Reopened")).toBe("In Progress");
  expect(normalizeStatusFilter("New,Pending,Reopened,Closed,Unknown")).toBe(
    "New,In Progress,Closed",
  );
});
