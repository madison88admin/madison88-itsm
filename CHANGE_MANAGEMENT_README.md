# Change Management Module (Manager + System Admin)

## Overview
This update strengthens the Change Management workflow with governance controls, clearer approval UX, and rejected-change cleanup support.

It is designed for:
- `it_manager`
- `system_admin`

---

## What Was Implemented

### 1. Governance and Workflow Controls
- Risk-based approval behavior (including auto-approval path for low-risk standard changes)
- Approval SLA due tracking
- RACI assignment fields
- Mandatory governance fields:
  - Business impact
  - Communication plan
  - Dependency map
  - Technical checklist gates
- Emergency controls:
  - Emergency justification
  - Retrospective/PIR tracking flags
- PIR gate before close when required
- Change conflict detection against overlapping windows/systems

### 2. Change Request UX Improvements
- Enhanced `Change Requests` section with explicit approval guidance for IT managers/admins
- Improved approval comment prompt to drive better decision quality
- Action descriptions/tooltips for:
  - Approve
  - Reject
  - Status progression
  - Delete rejected request

### 3. Rejected Change Deletion
- Rejected changes can now be deleted by manager/admin
- Inline confirm/cancel behavior in UI (no browser modal)
- Backend protection: only `rejected` status is deletable
- Compatibility endpoint added:
  - `DELETE /api/changes/:id`
  - fallback: `POST /api/changes/:id/delete`

---

## Backend Changes

Updated files:
- `backend/src/routes/changes.routes.js`
- `backend/src/models/change.model.js`

Added migration:
- `backend/src/migrations/20260227_change_management_governance.sql`

### API Endpoints (Change Management)
- `GET /api/changes`
- `GET /api/changes/:id`
- `POST /api/changes`
- `PATCH /api/changes/:id`
- `POST /api/changes/:id/approve`
- `GET /api/changes/:id/approvers`
- `GET /api/changes/check-conflicts`
- `GET /api/changes/calendar/upcoming`
- `DELETE /api/changes/:id` (rejected only)
- `POST /api/changes/:id/delete` (fallback; rejected only)

---

## Frontend Changes

Updated files:
- `frontend/src/pages/ChangeManagementPage.jsx`
- `frontend/src/index.css`

UI additions:
- Approval guide block for decision-making
- Better approval comment wording
- Inline rejected-delete confirmation
- Role-appropriate action hints for manager/admin

---

## Important Setup Step

Run the migration before using the new governance fields:

```bash
# Run your existing migration workflow
# and ensure this file is included:
backend/src/migrations/20260227_change_management_governance.sql
```

Also restart backend after deploy/code changes so new routes are active.

---

## Validation Notes

Validated in local checks:
- Backend syntax check passed for updated route/model files
- Frontend build compiles successfully
- Frontend lint has no new errors from this module (existing project warnings may still appear)

---

## Recommended QA Scenarios

1. Submit a normal change with required governance fields
2. Approve with decision comment and advance statuses in order
3. Reject a change and confirm delete
4. Verify conflict warning appears for overlapping windows/systems
5. Verify calendar lists scheduled/approved windows
6. Verify emergency change requires emergency justification
7. Verify close is blocked when PIR is required but incomplete

