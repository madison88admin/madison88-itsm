# User Manual
## Madison88 ITSM Platform

**March 2026**

---

## ISSUED BY
**Madison88 Business Solutions Asia Inc.**  
304 Plaz@ B Building, Northgate Cyberzone, Filinvest, Alabang, Muntinlupa City,  
Metro Manila, Philippines 1781

---

## Overview
Madison88 ITSM Platform is designed to let end users submit, track, and manage support tickets while enabling IT teams and administrators to monitor service performance, enforce SLA targets, and maintain operational control.

The system provides standardized ticket intake, real-time status updates, dashboard reporting, and audit trails to ensure accountability, compliance, and faster issue resolution across departments.

This expanded manual explains both end-user and admin workflows, including required steps, best practices, common mistakes to avoid, and escalation paths.

---

## Table of Contents
1. Steps for Ticket Submission  
2. Steps for Ticket Tracking  
3. Notification Preferences and Quiet Hours  
4. Knowledge Base and Smart Suggestions  
5. Admin System Guide  
6. Dashboard and KPI Guide  
7. User Management and Force Remove  
8. Broadcast and Governance  
9. System Status Checks  
10. Troubleshooting and Support  
11. Service Standards and SLA Expectations  
12. Security, Privacy, and Audit Trail  
13. Best Practices for End Users and Admins

---

## 1) Steps for Ticket Submission

### Purpose
To report issues in a complete and structured way so the system can route your ticket correctly and support teams can resolve it faster.

### Step-by-Step
1. **Enter Ticket Title**  
   - Use a clear and specific title (example: *“Cannot access payroll portal – 2FA timeout”*).  
   - Avoid vague titles such as *“Need help”* or *“Issue”*.

2. **Write Detailed Description**  
   Include the following details:
   - What happened
   - What you expected to happen
   - When the issue started
   - How many users are affected
   - Error messages or reference codes

3. **Select Category**  
   Choose the closest issue type (e.g., Access, Hardware, Software, Network, Email, Account).

4. **Select Location**  
   Confirm your assigned site/location to support proper team routing and SLA policy.

5. **Select Priority**  
   - Choose **Auto** if unsure (recommended)
   - Choose a specific urgency only if impact is known and urgent

6. **Attach Files**  
   Add screenshots, logs, or documents that support diagnosis.

7. **Click Submit**  
   The system generates a unique Ticket ID and sends a confirmation notification.

### After Submission
- Ticket appears in your ticket list immediately.
- Initial SLA countdown starts based on priority and support policy.
- Assigned support team receives alert and workload routing.

### Common Submission Mistakes to Avoid
- Missing impact details (e.g., users affected, business impact)
- Wrong category selection
- Uploading unreadable screenshots
- Submitting duplicate tickets for the same issue

---

## 2) Steps for Ticket Tracking

### Purpose
To monitor progress, respond to support requests quickly, and prevent delays in resolution.

### Step-by-Step
1. Go to **Tickets** page.
2. Search by **Ticket ID**, title, or keyword.
3. Filter by **status**, priority, category, assignee, or date.
4. Open a ticket to review timeline updates, comments, and actions.
5. Use quick reply actions when ticket is waiting for user response.

### Status Meaning Guide
- **New** – Ticket received, pending triage
- **In Progress** – Assigned and actively being worked on
- **Pending User** – Waiting for your response/input
- **Resolved** – Fix applied; awaiting validation or closure
- **Closed** – Completed and archived by workflow rules

### Best Practice
Respond to “Pending User” requests quickly. Delays in user response can pause or extend SLA clocks depending on policy.

---

## 3) Notification Preferences and Quiet Hours

### Purpose
To control how and when you receive updates while reducing alert fatigue.

### Step-by-Step
1. Go to **Profile Settings > Notification Preferences**.
2. Enable or disable:
   - Ticket update notifications
   - Broadcast announcements
   - Browser push notifications
3. Enable **Quiet Hours** and set start/end time.
4. Save changes to apply personal notification rules.

### Important Notes
- Critical alerts may still be delivered based on governance rules.
- Quiet Hours affects personal alerts, not system-wide admin alerts.
- Browser push notifications require browser permission.

### Recommended Setup
- Keep ticket updates enabled for active tickets.
- Set Quiet Hours outside your working schedule.
- Keep at least one notification channel active (email or in-app).

---

## 4) Knowledge Base and Smart Suggestions

### Purpose
To reduce repeat incidents and improve ticket quality before submission.

### How It Works
- While creating a ticket, related KB articles are shown automatically.
- Suggested content is based on your title, description, and selected category.
- Guided description templates help users provide complete details.
- Template insertion controls prevent repeated spam insertion and duplicate content.

### User Steps
1. Review suggested articles before submitting.
2. Try the recommended fix if safe and applicable.
3. If unresolved, continue ticket submission and mention attempted steps.

### Benefits
- Faster first-response and diagnosis
- Higher first-contact resolution rate
- Lower duplicate ticket volume

### UI/UX Enhancements (Knowledge Base)

#### Search-first Layout
- Put a large global search bar at the top with instant results.
- Add typo-tolerance and synonym mapping (example: `wifi` = `network`).

#### Smart Filters and Chips
- Add filters for:
  - Category
  - Product
  - Role
  - Location
  - Last Updated
- Show active filter chips with one-click remove.

#### Actionable Content Blocks
- Provide copy-ready command/code blocks with a **Copy** button.
- Add troubleshooting checklists with checkbox progress.

#### Ticket Deflection UX
- While user types ticket title/description, show top 3 relevant KB articles inline.
- If user opens an article, keep draft ticket data intact.

#### Mobile Optimization
- Use bigger tap targets.
- Use collapsible sections for long content.
- Add sticky **Search** and **Create Ticket** buttons.
- Avoid deep nested menus on phone.

---

# System Guide
## Madison88 ITSM Platform

**March 2026**

---

## ISSUED BY
**Madison88 Business Solutions Asia Inc.**  
304 Plaz@ B Building, Northgate Cyberzone, Filinvest, Alabang, Muntinlupa City,  
Metro Manila, Philippines 1781

---

## 5) Admin System Guide

### Admin Dashboard Cards
Dashboard cards show:
- **Active Issues**
- **SLA Compliance**
- **Resolved Today**

Clicking KPI cards opens ticket lists with exact filters and visible filter chips for transparency.

### Performance Trend Widgets
Performance Trend supports:
- **Volume**
- **SLA Breach**
- **MTTR (Mean Time to Resolution)**

### Live Activity Pulse
Displays deduplicated activity events with severity colors:
- **Info**
- **Warning**
- **Critical**

Includes **Last Updated** timestamp to indicate data freshness.

### Admin Responsibilities
- Monitor SLA risk and backlog changes
- Validate assignment balance and response delays
- Trigger escalation when breach risk is rising
- Review anomalies before major operations windows

---

## 6) Dashboard and KPI Guide

### Core KPIs and Meaning
- **Active Issues**: Number of currently open tickets
- **SLA Compliance**: Percentage of tickets within SLA targets
- **Resolved Today**: Tickets resolved within current day window
- **MTTR**: Average resolution time for completed tickets
- **Breach Count**: Tickets that exceeded SLA thresholds

### How to Read KPI Changes
- Rising active issues + rising breach count = capacity or routing risk
- Stable volume + falling MTTR = process efficiency improvement
- High resolved today + low SLA compliance = backlog cleared but late

### Drill-Down Flow
1. Click KPI card.
2. Review pre-applied filters and chips.
3. Adjust date range or team scope.
4. Export view if needed for reporting.

### Data Integrity Reminder
Always verify selected date range and filters before presenting KPI values.

---

## 7) User Management and Force Remove

### Admin Functions
Admins can:
- Archive users
- Restore users
- Force remove users (including linked records, based on policy)

All critical actions are logged in admin activity feed and audit logs.

### Archive vs Force Remove
- **Archive**: Account deactivated but recoverable
- **Restore**: Archived account reactivated
- **Force Remove**: Irreversible action, policy-controlled, may remove linked records

### Recommended Governance Flow
1. Validate user status and manager approval.
2. Check linked records and operational dependencies.
3. Execute action with reason code.
4. Confirm audit log entry and timestamp.

---

## 8) Broadcast and Governance

### Broadcast Features
Admins can send announcements with:
- Template presets
- Audience preview count
- Cooldown timer (anti-spam protection)

### Governance Controls
- Role-based permission for broadcast creation and release
- Cooldown windows to avoid duplicate message flooding
- Audit log capture for message content, target audience, and sender

### Broadcast Best Practices
- Keep title short and action-oriented
- Include clear expected action and deadline
- Use one source of truth link
- Avoid over-sending low-priority notices

---

## 9) System Status Checks

### Health Components
System status is based on real health checks:
- Database
- Redis
- Email Gateway (SMTP)
- Queue
- API latency

If any component is degraded, status shows an attention warning.

### Practical Interpretation
- **Healthy**: All checks passing within thresholds
- **Degraded**: One or more checks failing or slow
- **Critical**: Multiple core components failing

### Immediate Admin Actions for Degraded Status
1. Open status panel details.
2. Identify failing component and timestamp.
3. Check recent deployments or config changes.
4. Trigger incident workflow if service impact is confirmed.

---

## 10) Troubleshooting and Support

### Common Issues and Checks

**If route not found:**
- Verify backend routes and deployment version.
- Confirm API base URL and environment config.

**If KPI values are incorrect:**
- Check date range and status filter logic.
- Validate aggregation source and timezone assumptions.

**If notifications fail:**
- Validate notification preference payload fields.
- Check SMTP/provider health and user opt-in state.

**If dashboard widgets are blank:**
- Check API response shape and frontend mapping.
- Confirm auth token validity and role permissions.

### Escalation Path
1. End user raises ticket with complete details.
2. IT agent performs triage and first-level diagnostics.
3. IT manager/admin reviews if recurring or high-impact.
4. Platform team escalation for system-level defects.

### Support Contact
For assistance, contact:  
**Madison88 Business Solutions Asia IT Department**

---

## 11) Service Standards and SLA Expectations

### Typical SLA Targets (Example Policy)
- **P1 / Critical**: Immediate response, fastest restoration target
- **P2 / High**: Same business day response and priority handling
- **P3 / Medium**: Standard queue handling within business SLA
- **P4 / Low**: Planned handling and backlog optimization

Actual SLA values may vary by department, support window, and approved policy.

### SLA Handling Rules
- SLA starts when ticket is successfully created.
- SLA may pause when waiting for user-required input.
- Breach events are captured in reporting and audit history.

---

## 12) Security, Privacy, and Audit Trail

### Security Principles
- Role-based access controls for user, agent, manager, and admin functions
- Least-privilege permissions for sensitive actions
- Protected authentication and session handling

### Audit and Compliance
- Critical actions (user management, force remove, broadcast, priority changes) are logged.
- Logs include actor, action type, timestamp, and target entity.
- Audit records support accountability and internal review.

### User Responsibility
- Do not share credentials.
- Do not upload sensitive files unless required.
- Use official communication channels for approvals and escalations.

---

## 13) Best Practices for End Users and Admins

### End User Best Practices
- Submit one issue per ticket.
- Use specific titles and complete descriptions.
- Add screenshots with visible error details.
- Respond quickly when status is **Pending User**.

### Admin Best Practices
- Review KPI trends daily, not only totals.
- Check filter chips before sharing dashboard numbers.
- Use archive before force remove unless policy requires immediate purge.
- Keep broadcast messages controlled, clear, and actionable.

### Operational Best Practices
- Review recurring issue patterns weekly.
- Convert common fixes into KB articles.
- Align dashboard review with SLA and governance meetings.

---

## Document Control
- **Document Type:** User and Admin Manual
- **System:** Madison88 ITSM Platform
- **Version:** 1.0 (Expanded)
- **Release Date:** March 2026
- **Owner:** Madison88 Business Solutions Asia IT Department

---

**End of Document**
