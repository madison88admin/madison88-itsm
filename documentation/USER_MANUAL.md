# Madison88 ITSM - User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [End User Guide](#end-user-guide)
4. [IT Agent Guide](#it-agent-guide)
5. [IT Manager Guide](#it-manager-guide)
6. [Common Tasks](#common-tasks)
7. [FAQ](#faq)

---

## Introduction

The Madison88 IT Service Management (ITSM) Platform is a centralized system for managing IT support tickets, service requests, and knowledge base articles across the organization. This guide covers all major features and how to use them effectively.

### Key Benefits

- **Centralized Ticketing**: No more scattered emails
- **SLA Management**: Automatic tracking of response and resolution times
- **Knowledge Base**: Self-service problem resolution
- **Real-time Updates**: Instant notifications
- **Mobile Friendly**: Access from any device
- **Comprehensive Reporting**: Visibility into IT operations

---

## Getting Started

### Logging In

1. Navigate to `https://itsm.madison88.com`
2. Enter your Madison88 email address
3. Enter your password
4. Click "Login"

### First-Time Setup

**For New Users:**

1. Update your profile with phone number and location
2. Set your notification preferences
3. Bookmark the platform for quick access

**For IT Agents:**

1. Review team assignments
2. Set up your queue preferences
3. Configure email notification rules

---

## End User Guide

### Creating a Ticket

1. Open the left menu and click **"New Ticket"**
2. (Optional) Select a **Template** to prefill common fields
3. Fill in the required fields:
   - **Category**: Hardware, Software, Access Request, Account Creation, Network, or Other
   - **Title**: Brief summary of the issue
   - **Description**: Detailed explanation of the problem
   - **Business Impact**: How this affects your work
   - **Location**: Philippines, US, Indonesia, or Other
   - **Priority (optional)**: Leave as Auto if unsure
   - **Attachments**: Add screenshots or files (optional)

4. Click **"Submit"**

**Note:** If Priority is left blank, the system automatically calculates it.

### Tracking Your Tickets

1. Click **"Tickets"** from the menu
2. View ticket status, assignee, and SLA countdown
3. Click a ticket to see details

### Communicating on Tickets

1. Open your ticket
2. Scroll to the **"Comments"** section
3. Type your message in the text box
4. Click **"Post Comment"**

**Tip:** Check the ticket details page regularly for agent responses.

### Uploading Attachments

1. In the ticket detail view, find the **"Attachments"** section
2. Click **"Add Attachment"**
3. Select a file (max 10MB per file, 50MB total)
4. Supported types: PDF, PNG, JPG, XLSX, DOCX, MSG
5. Click **"Upload"**

### Searching the Knowledge Base

1. Click **"Knowledge Base"** from the menu
2. Use the search box to find articles
3. Filter by category if needed
4. Click on an article to read

---

## SLA Countdown and Alerts

- **SLA Countdown** appears on each ticket card and detail view
- **Warning** badge shows when the ticket is close to breach
- **Breached** badge shows when the SLA time has passed
- If configured, the system can auto-escalate near breach

---

## IT Agent Guide

### Viewing Your Queue

1. Click **"Tickets"** to see tickets assigned to you
2. Filter by status (New, In Progress, Pending, etc.)
3. Sort by priority, date, or SLA due date

### Accepting & Assigning Tickets

1. Go to **"Team Queue"** to view unassigned tickets
2. Click a ticket to review details
3. Managers/Admins can assign tickets to agents

**SLA Indicators:**

- 🟢 Green: On track (< 80% time used)
- 🟡 Yellow: Warning (80-100% time used)
- 🔴 Red: Breached (time exceeded)

### Updating Ticket Status

1. Open the ticket
2. Click the **"Status"** dropdown
3. Select new status:
   - **New**: Initial state
   - **In Progress**: Currently working on it
   - **Pending**: Waiting for user response
   - **Resolved**: Issue is fixed, awaiting user confirmation
   - **Closed**: Ticket complete

4. Click **"Save"**

**Resolution Requirement:**

When setting **Resolved** or **Closed**, fill in:
- **Resolution Summary**
- **Resolution Category**
- **Root Cause**

### Adding Internal Notes

1. Open the ticket
2. Scroll to **"Comments"** section
3. Check **"Internal Only"** checkbox
4. Type your note
5. Click **"Post Comment"**

**Note:** Internal notes are not visible to end users.

### Adding Public Comments

1. Open the ticket
2. Scroll to **"Comments"** section
3. Leave **"Internal Only"** unchecked
4. Type your response
5. Click **"Post Comment"**

The end user will be notified of your response.

### Priority Changes

- **Agents cannot change priority directly.**
- Managers can **request a priority override**.
- Admins can **approve and apply** priority overrides.

### Escalating Tickets

1. Click **"Escalate"** button
2. Select escalation reason
3. Add notes
4. Click **"Escalate to Manager"**

Your manager will be notified and can take over the ticket.

### Converting to Change Request

1. Open the ticket
2. Click **"Create Change Request"** button
3. Fill in change details
4. Click **"Create"**

The change request will require approval before implementation.

### SLA Tracking

**Understanding SLA:**

- **Response SLA**: Time to first response
- **Resolution SLA**: Time to resolve the issue
- SLAs vary by priority level (P1: 1hr/4hrs, P2: 4hrs/24hrs, etc.)

**When SLA is Breached:**

- Ticket shows red SLA indicator
- Manager is notified
- Escalation process may be triggered

---

## IT Manager Guide

### Dashboard Overview

Click **"Dashboard"** to view:

- **SLA Performance**: % of tickets meeting SLA
- **Ticket Volume**: Trends and distribution
- **Team Performance**: Agent metrics
- **Aging Report**: Tickets open > 7, 14, 30 days

### Viewing All Tickets

1. Click **"Tickets"** or **"Team Queue"**
2. Filter by:
   - Status
   - Priority
   - Category
   - Location
   - Date range
   - Unassigned only

3. Use **bulk assign** to assign multiple tickets at once

### Team Management

Team membership is managed by IT admins in the database. Managers use **Team Queue** to manage assignment and workload.

### Managing Change Requests

1. Click **"Changes"**
2. Review pending change requests
3. Click a change to review impact
4. Click **"Approve"** or **"Request Changes"**
5. For approved changes, monitor implementation

### SLA Rule Management

1. Click **"Admin"** → **"SLA Rules"**
2. View current SLA timelines
3. Edit response/resolution hours if needed
4. Verify escalation thresholds
5. Click **"Save Changes"**

### Accessing Reports

**Standard Reports:**

- SLA Compliance Report
- Ticket Volume Report
- Team Performance Report
- Aging Tickets Report

**How to Export:**

1. Open desired dashboard
2. Click **"Export"** button
3. Choose CSV or JSON format
4. Select date range
5. Click **"Download"**

**Advanced Reporting** includes trends, workload charts, and heatmaps.

### User Management

1. Click **"Admin"** → **"Users"**
2. View all users and roles
3. Click user to edit:
   - Role (End User, IT Agent, IT Manager, Admin)
   - Department
   - Location
   - Active status

4. Click **"Save Changes"**

### Audit Trail Review
Audit data can be exported from **Advanced Reporting**.

### Ticket Templates

1. Open **"Ticket Templates"**
2. Create or update templates for common requests
3. End users select templates in **New Ticket**

### Asset Health

Asset Tracking shows a **Health Score** based on open ticket count and age.

---

## Common Tasks

### Task 1: Urgent Priority Issue

**Scenario:** System outage affecting 100+ users

**Steps:**

1. End user creates ticket with "System outage" in title
2. System auto-classifies as P1 (Critical)
3. SLA: 1 hour response, 4 hours resolution
4. Routed to appropriate team immediately
5. Manager receives escalation notification
6. Team prioritizes and works on resolution
7. Real-time updates sent to all stakeholders

### Task 2: Bulk Assign Unassigned Tickets

**Scenario:** Team Queue has multiple unassigned tickets

**Steps:**

1. Manager opens **"Team Queue"**
2. Filter **Unassigned only**
3. Select multiple tickets using checkboxes
4. Choose an agent in the bulk assign bar
5. Click **"Assign selected"**

### Task 3: SLA Breach Prevention

**Scenario:** P2 ticket near SLA breach

**Steps:**

1. Agent assigned ticket, works on solution
2. SLA badges show warning and breach
3. Agent either:
   - Completes resolution, or
   - Updates ticket with progress, or
   - Escalates to manager if blocked
4. If breached:
   - Marked as SLA breached in system
   - Manager notified
   - Added to aging report

### Task 4: Knowledge Base Self-Service

**Scenario:** User needs password reset

**Steps:**

1. User searches KB for "password reset"
2. Finds article with step-by-step instructions
3. Follows guide to reset password
4. Rates article as helpful
5. No ticket created - issue resolved instantly

---

## FAQ

### Q: How do I know my ticket status?

**A:** Log in, click "Tickets", and view the status. You also see SLA countdown badges.

### Q: What do the priority levels mean?

**A:** P1 = Critical (system down, security risk), P2 = High (affecting many users), P3 = Medium (individual user), P4 = Low (information request)

### Q: Can I attach files to my ticket?

**A:** Yes, up to 50MB total per ticket. Supported formats: PDF, PNG, JPG, XLSX, DOCX, MSG

### Q: How long will it take to resolve my issue?

**A:** Depends on priority:

- P1: 4 hours
- P2: 24 hours
- P3: 72 hours
- P4: 5 business days

### Q: What if I don't agree with the assigned priority?

**A:** Reply to your ticket. Managers can request a priority override; admins can approve and apply it.

### Q: Can I talk to someone directly?

**A:** Comments on your ticket are the primary communication method. For urgent matters (P1), your assigned agent may call you.

### Q: What happens if my ticket stays open after SLA time?

**A:** The SLA is marked as breached and the ticket is flagged for escalation.

### Q: How do I search the knowledge base?

**A:** Click "Knowledge Base" in the menu, use the search box, and filter by category if needed.

### Q: Can I close my own ticket?

**A:** Only IT agents and managers can officially close tickets, but you can indicate resolution in a comment.

### Q: Why haven't I received a response?

**A:** Check the SLA countdown on your ticket. If within SLA, the agent is likely working on it. If breached, escalate to manager.

### Q: Do you have a mobile app?

**A:** The platform is fully mobile-responsive in your browser. You can also bookmark it on your phone home screen.

### Q: How often is the knowledge base updated?

**A:** Articles are continuously added and updated. Changes go through an approval process.

### Q: Can I export ticket data?

**A:** Managers/Admins can export from Advanced Reporting.

### Q: Is the platform secure?

**A:** Yes, it uses HTTPS encryption, role-based access control, and comprehensive audit logging.

---

## Support

For issues with the ITSM platform itself:

- **Email**: it-support@madison88.com
- **Phone**: +63-2-XXXX-XXXX (Philippines)
- **Hours**: 8 AM - 6 PM (Local timezone)

---

**Last Updated:** February 9, 2026
**Version:** 1.1
