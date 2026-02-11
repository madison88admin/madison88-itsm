# Madison88 ITSM – QA Review & BRD Compliance

**Reviewer:** QA Engineer (expert review)  
**Stack verified:** Backend **Node.js + Express + PostgreSQL** (pg); Frontend **React** (create-react-app). *Note: BRD referenced Supabase/Next.js; this codebase uses PostgreSQL and React. No Supabase RLS; access control is application-layer (JWT + role-based middleware).*

---

## 1. Backend (Node.js + PostgreSQL)

### 1.1 Database queries, ordering, pagination

| Check | Finding | Severity |
|-------|---------|----------|
| **listTickets ORDER BY** | Correct: (1) Escalated (row or ≥80% SLA), (2) P1→P2→P3→P4 ASC, (3) SLA breached, (4) created_at DESC. Same WHERE used for COUNT and SELECT; OFFSET/LIMIT prevent duplicate rows across pages. | ✅ Compliant |
| **Pagination** | `page` and `limit` from query; frontend sends limit=5. Total from COUNT(*). No off-by-one or missing total. | ✅ Compliant |
| **BRD ordering vs implemented** | BRD states: *Escalated > SLA Breached > P1 > P2 > P3 > P4 > New*. Implemented order is **Escalated > P1..P4 > SLA Breached > Newest**. SLA Breached is after priority, not before. | ⚠️ **Gap** |

**Fix (ordering):** If BRD must be strictly “SLA Breached before priority,” change `ORDER BY` in `backend/src/models/tickets.model.js` so the second term is the breach expression and the third is the priority CASE (swap current second and third ORDER BY terms).

---

### 1.2 Resolved tickets archived and excluded from active queue

| Check | Finding | Severity |
|-------|---------|----------|
| **On Resolved/Closed** | `updateTicket` sets `is_archived = true`, `archived_at = now`. | ✅ Compliant |
| **Active queue filter** | When `exclude_archived` is true, model adds `(is_archived IS NULL OR is_archived = false)` and `status NOT IN ('Resolved','Closed')`. Resolved/Closed are excluded from default list. | ✅ Compliant |
| **Reopened** | On status → Reopened, `is_archived = false`, `archived_at = null` so ticket returns to active queue. | ✅ Compliant |
| **Status filter** | When user selects status = Resolved or Closed, `exclude_archived` is not set so those tickets are visible. | ✅ Compliant |

---

### 1.3 Escalation and SLA breach logic

| Check | Finding | Severity |
|-------|---------|----------|
| **Escalation job** | `runSlaEscalations` runs on interval; creates rows in `ticket_escalations` when ticket is at/past threshold %; `hasSlaEscalation` prevents duplicate escalation rows. | ✅ Compliant |
| **Ordering “escalated”** | First ORDER BY uses both (a) EXISTS in `ticket_escalations` and (b) ≥80% of SLA window elapsed (so UI “Escalated” matches even before job runs). | ✅ Compliant |
| **Breach in ordering** | Breach computed as `sla_breached = true OR (sla_due_date < NOW() AND status NOT IN ('Resolved','Closed'))`. Works for sort. | ✅ Compliant |
| **sla_breached column** | Column exists in schema but is never set to `true` in application code. Ordering still correct via date expression. | ⚠️ **Low** |

**Suggestion:** Optionally update `tickets.sla_breached` (and `sla_response_breached`) in the SLA job or when computing status so reporting and future queries can rely on the column.

---

### 1.4 API: error handling, security, audit logging

| Check | Finding | Severity |
|-------|---------|----------|
| **Error handling** | Central error middleware maps message to status (403/404/400/409/500). Services use `AppError` for 403/404/400/409. Controllers use `next(err)`. | ✅ Compliant |
| **Auth** | JWT in `Authorization`; `authenticate` verifies token and loads user; `authorize(roles)` enforces role. | ✅ Compliant |
| **Role-based access** | Ticket create: `end_user` only. List/get/update: scoped by role (end_user own, it_agent assigned, it_manager teams, system_admin all). Audit log read: system_admin + it_manager (manager for own teams). | ✅ Compliant |
| **Audit logging** | create/update/routed/commented/attachment_added/escalated/priority_override/bulk_assigned/sla_auto_escalated/auto_closed logged with ticket_id, user_id, action_type, ip_address, user_agent, session_id. | ✅ Compliant |
| **Rate limiting** | express-rate-limit on `/api/` (e.g. 100/15min prod). | ✅ Compliant |
| **Priority override** | `listPriorityOverrideRequests` / `requestPriorityOverride` use `throw new Error('Forbidden')` instead of `AppError`; global handler still maps to 403. | ✅ OK (optional: use AppError for consistency) |

---

### 1.5 Performance

| Check | Finding | Severity |
|-------|---------|----------|
| **listTickets** | Single query for data with ORDER BY; separate COUNT. No N+1. | ✅ OK |
| **getTicketDetails** | Fetches ticket, comments, attachments, assets in parallel (model calls). No redundant list. | ✅ OK |
| **listTickets (manager)** | Two extra queries: `listTeamIdsForUser`, then `listTeamMemberIdsForTeams`. Acceptable. | ✅ OK |
| **Connection pool** | pg Pool max 20, timeouts set. | ✅ OK |

**Suggestion:** If dashboard/export returns large result sets, add a max limit (e.g. 10k rows) or pagination to avoid memory spikes.

---

## 2. Frontend (React)

### 2.1 Ticket list pagination (top 5, next 5)

| Check | Finding | Severity |
|-------|---------|----------|
| **Page size** | `PAGE_SIZE = 5`; `page` and `limit` sent to API. | ✅ Compliant |
| **Next 5 / Previous 5** | Buttons show when `hasNext` / `hasPrev`; disabled when `loading`. Prevents spam-click. | ✅ Compliant |
| **Page reset** | Filters and view mode changes set `page` to 1. | ✅ Compliant |
| **Empty page** | If current page has 0 tickets but total > 0, page is reset to 1. | ✅ Compliant |

---

### 2.2 UI ordering vs business rules

| Check | Finding | Severity |
|-------|---------|----------|
| **Display order** | List is not re-sorted on frontend; order comes from backend. Backend order: Escalated → P1..P4 → Breached → Newest. | ✅ Consistent |
| **BRD text** | UI text says “Escalated → P1 → P2 → P3 → P4, then SLA breach, then newest.” Matches current implementation. If BRD requires “Escalated > SLA Breached > P1..P4 > New,” backend ORDER BY should be updated (see §1.1). | ⚠️ Align with BRD |

---

### 2.3 Resolved tickets and archive view

| Check | Finding | Severity |
|-------|---------|----------|
| **Default list** | Without “Show archived,” `include_archived` is not sent; backend applies `exclude_archived` and status filter. Resolved/Closed do not appear. | ✅ Compliant |
| **Show archived** | When checked, `include_archived=true`; backend does not apply active-queue filter; Resolved/Closed and archived tickets appear. | ✅ Compliant |

---

### 2.4 Edge cases

| Check | Finding | Severity |
|-------|---------|----------|
| **Empty state** | “No tickets yet. Create your first request.” when list is empty. | ✅ Compliant |
| **Spam-click** | Submit (create ticket) and pagination buttons disabled while loading. Idempotency key supported for create. | ✅ Compliant |
| **Duplicate handling** | 409 with `possible_duplicates`; “Submit anyway” with `confirm_duplicate`. | ✅ Compliant |

---

### 2.5 Dashboards and export

| Check | Finding | Severity |
|-------|---------|----------|
| **Dynamic update** | Manager/Admin dashboards and ticket list subscribe to `dashboard-refresh` (Socket.io); refetch on event. Polling every 30s on ticket list when tab visible. | ✅ Compliant |
| **Dashboard export** | `GET /api/dashboard/export?format=csv|json` returns tickets (with optional date filter). CSV/JSON working. | ✅ Compliant |
| **Audit export** | `GET /api/audit/export` supports CSV/JSON/PDF; role `it_manager` or `system_admin`. | ✅ Compliant |
| **BI export** | `GET /api/bi/tickets?format=csv` for Power BI–style export. | ✅ Compliant |
| **Export scope** | Dashboard and audit export are org-wide (no scoping by manager’s teams). If BRD requires manager to see only their teams’ data in export, add filter by team. | ⚠️ **Low** |

---

## 3. Integration (ITSM ↔ Inventory / Assets)

| Check | Finding | Severity |
|-------|---------|----------|
| **Asset–ticket link** | `asset_tickets` table links `asset_id` and `ticket_id`. `POST /api/assets/:id/link-ticket` creates link; ticket detail loads `listTicketAssets`. | ✅ Compliant |
| **Asset status on ticket resolve** | No database trigger or application code updates asset status when a linked ticket is resolved or closed. BRD may require “triggers updating asset status.” | ⚠️ **Gap** |
| **Visibility** | Asset routes use `authorize(['it_agent', 'it_manager', 'system_admin', 'end_user'])`; link-ticket restricts to asset’s `assigned_user_id` for end_user. No Supabase RLS; visibility is application-enforced. | ✅ OK for current stack |

**Fix (asset status):** On ticket transition to Resolved or Closed, optionally call an asset service (or run a small job) that updates linked assets (e.g. set an “open_ticket_count” or status field) or add a DB trigger on `tickets` that updates a denormalized asset view when `status` changes to Resolved/Closed.

---

## 4. Testing & QA

### 4.1 Current coverage

| Area | Finding |
|------|---------|
| **Unit / integration tests** | No test files found (`**/*.test.js` or similar). Jest and Supertest are in backend package.json but no tests implemented. |
| **E2E** | Cypress in frontend devDependencies; no Cypress specs found. |

---

### 4.2 Suggested tests

**Backend (Jest + Supertest):**

- **Ticket creation:** Valid payload → 201, ticket and routing/audit; invalid payload → 400; non–end_user → 403; duplicate without confirm → 409; with confirm_duplicate → 201.
- **listTickets:** With `exclude_archived` and no status filter → no Resolved/Closed; with status=Resolved → Resolved tickets returned; ordering: escalated/P1 before P4 in first page.
- **updateTicket → Resolved:** Requires resolution fields; sets is_archived; ticket excluded from default list on next listTickets.
- **Reopened:** Sets is_archived = false; ticket appears again in active list.
- **SLA escalation job:** Mock DB with ticket at ≥ threshold; run job; assert escalation row and audit log.
- **Priority override:** Request as manager → pending; approve as admin → ticket priority updated; audit log entries.
- **Auth:** Missing/invalid token → 401; wrong role → 403.

**Frontend (React Testing Library / Jest):**

- **TicketsPage:** Renders empty state when no tickets; pagination shows Next 5 only when total > 5; buttons disabled while loading.
- **NewTicketPage:** Validation errors for short title/description; duplicate 409 shows “Submit anyway”; submit disabled while loading.

**E2E (Cypress):**

- **Happy path:** Login → create ticket (with optional attachment) → ticket appears in list → open ticket → add comment → resolve (with resolution fields) → ticket no longer in default list; with “Show archived” it appears.
- **Pagination:** Create 6+ tickets → page 1 shows 5 → Next 5 shows remaining; order reflects priority/escalation.

---

### 4.3 CI/CD suggestions

- **Lint:** Run `npm run lint` (backend and frontend) on every PR.
- **Unit/integration:** Run backend and frontend test suites; fail PR if tests fail or coverage drops below a threshold (e.g. 70% for services).
- **E2E:** Run Cypress (or Playwright) against a staging build on merge to main or nightly.
- **Security:** Run `npm audit`; consider a dependency scanner in CI.
- **Build:** Frontend `npm run build` to catch build errors.

---

## 5. Summary

### Compliant with BRD

- Resolved tickets are archived and excluded from the active queue; Reopened returns them.
- Pagination (top 5, next 5), spam-click prevention, duplicate handling, and empty states behave as required.
- Escalation (row + 80% threshold) and SLA breach are used in ordering and escalation job.
- API auth, role-based access, audit logging, and error handling are in place.
- Dashboards update via Socket and polling; CSV/JSON/PDF export and BI export work.
- ITSM–asset linkage exists (asset_tickets, link-ticket, ticket detail shows assets).

### Issues and gaps

1. **Ordering vs BRD:** If BRD strictly requires “Escalated > SLA Breached > P1 > P2 > P3 > P4 > New,” backend ORDER BY should put SLA breach before priority (swap 2nd and 3rd terms in `tickets.model.js`).
2. **Asset status on resolve:** No trigger or application logic updates asset status when a linked ticket is resolved/closed; add if BRD requires it.
3. **sla_breached column:** Never set in code; ordering still correct via date expression; optional to set in SLA job for consistency.
4. **Export scoping:** Dashboard/audit export are org-wide; consider scoping by manager’s teams if required by BRD.
5. **Test coverage:** No unit, integration, or E2E tests; add tests for creation, list/ordering, resolve/archive, escalation, priority override, and auth.

### Stack clarification

- Backend: **Node.js + Express + PostgreSQL** (pg driver), Redis, Socket.io. No Supabase.
- Frontend: **React** (create-react-app). No Next.js.
- Access control: **Application-layer** (JWT + `authorize(roles)`). No Supabase RLS; if the project is migrated to Supabase, RLS policies should mirror current role and scope rules (end_user own, it_agent assigned, it_manager by team, system_admin all).

---

*QA review complete. Apply fixes per BRD and risk; add automated tests and CI checks as recommended.*
