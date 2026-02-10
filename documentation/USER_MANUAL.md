
# Madison88 ITSM Platform

## Table of Contents

- Introduction
- Getting Started
- End User Guide
- IT Agent Guide
- IT Manager Guide
- Common Tasks
- Frequently Asked Questions (FAQ)
- Support

---

## 1. Introduction

The Madison88 IT Service Management (ITSM) Platform is a centralized system for managing IT support tickets, service requests, change requests, and knowledge base articles across the organization. It provides transparency, accountability, and faster resolution of IT issues.

This user manual explains the platform’s core features and provides step-by-step instructions for end users, IT agents, and IT managers.

### Key Benefits

- Centralized Ticketing – One platform for all IT requests
- SLA Management – Automatic tracking of response and resolution times
- Knowledge Base – Self-service solutions for common issues
- Real-Time Updates – Notifications and live status tracking
- Mobile-Friendly – Accessible from desktop, tablet, and mobile devices
- Comprehensive Reporting – Clear visibility into IT performance

---

## 2. Getting Started

### 2.1 Logging In

1. Open your browser and go to https://itsm.madison88.com
2. Enter your Madison88 email address
3. Enter your password
4. Click Login

### 2.2 First-Time Setup

**For All Users:**

- Update your profile information (phone number and location)
- Configure notification preferences
- Bookmark the platform for quick access

**For IT Agents:**

- Review your team and role assignments
- Configure personal queue filters
- Set up email or in-app notification rules

---

## 3. End User Guide

### 3.1 Creating a Ticket

1. Open the left navigation menu
2. Click New Ticket
3. (Optional) Select a Ticket Template to prefill common fields
4. Complete the required information:
   - Category: Hardware, Software, Access Request, Account Creation, Network, or Other
   - Title: Short summary of the issue
   - Description: Detailed explanation of the problem
   - Business Impact: How the issue affects your work
   - Location: Philippines, US, Indonesia, or Other
   - Priority (optional): Leave as Auto if unsure
   - Attachments (optional): Screenshots or supporting files
5. Click Submit

**Note:** If priority is left as Auto, the system calculates it based on impact and urgency.

### 3.2 Tracking Your Tickets

1. Click Tickets from the menu
2. View ticket status, assigned agent, and SLA countdown
3. Click a ticket to open its detailed view

### 3.3 Communicating on Tickets

1. Open the ticket
2. Scroll to the Comments section
3. Enter your message
4. Click Post Comment

**Tip:** Check your ticket regularly for agent updates or requests for information.

### 3.4 Uploading Attachments

1. Open the ticket detail page
2. Locate the Attachments section
3. Click Add Attachment
4. Select a file (maximum 10 MB per file, 50 MB total)
5. Supported file types: PDF, PNG, JPG, XLSX, DOCX, MSG
6. Click Upload

### 3.5 Using the Knowledge Base

1. Click Knowledge Base from the menu
2. Use the search bar to find relevant articles
3. Apply category filters if needed
4. Open an article to view the solution

---

## 4. SLA Countdown and Alerts

- SLA countdown timers appear on ticket cards and detail pages
- Warning indicators appear when a ticket is close to breaching SLA
- Breached indicators appear when SLA time is exceeded
- Automatic escalation may occur if configured

---

## 5. IT Agent Guide

### 5.1 Viewing Your Ticket Queue

1. Click Tickets to view tickets assigned to you
2. Filter by status (New, In Progress, Pending, Resolved)
3. Sort by priority, creation date, or SLA due time

### 5.2 Accepting and Assigning Tickets

1. Open Team Queue to view unassigned tickets
2. Select a ticket to review details
3. Managers or Admins assign tickets to agents

**SLA Indicators:**

- 🟢 Green – On track (less than 80% of SLA used)
- 🟡 Yellow – Warning (80–100% of SLA used)
- 🔴 Red – Breached (SLA exceeded)

### 5.3 Updating Ticket Status

1. Open the ticket
2. Select a new value from the Status dropdown:
   - New – Ticket just created
   - In Progress – Actively being worked on
   - Pending – Waiting for user or third-party input
   - Resolved – Issue fixed, awaiting confirmation
   - Closed – Ticket fully completed
3. Click Save

**Required When Resolving or Closing:**

- Resolution Summary
- Resolution Category
- Root Cause

### 5.4 Internal vs Public Comments

**Internal Notes:**

1. Open the ticket
2. In the Comments section, check Internal Only
3. Add notes for internal use

**Public Comments:**

1. Leave Internal Only unchecked
2. End users will be notified of your response

### 5.5 Priority Changes and Escalation

- Agents cannot directly change ticket priority
- Managers may request priority overrides
- Admins approve and apply priority changes

**Escalating a Ticket:**

1. Click Escalate
2. Select the escalation reason
3. Add supporting notes
4. Click Escalate to Manager

### 5.6 Change Requests

1. Open the ticket
2. Click Create Change Request
3. Enter change details
4. Submit for approval

---

## 6. IT Manager Guide

### 6.1 Dashboard Overview

The Dashboard provides visibility into:

- SLA compliance
- Ticket volume and trends
- Agent performance
- Aging tickets (7, 14, and 30+ days)

### 6.2 Ticket and Team Management

1. View all tickets using Tickets or Team Queue
2. Filter by status, priority, category, location, or date range
3. Use bulk assignment to assign multiple tickets at once

### 6.3 Change Management

1. Click Changes
2. Review pending change requests
3. Approve or request changes
4. Monitor approved changes during implementation

### 6.4 SLA Rule Management

1. Navigate to Admin → SLA Rules
2. Review response and resolution timelines
3. Adjust escalation thresholds if required
4. Save changes

### 6.5 Reporting and Exporting

**Available Reports:**

- SLA Compliance
- Ticket Volume
- Team Performance
- Aging Tickets

**Export Options:**

1. Open a report or dashboard
2. Click Export
3. Choose CSV or JSON
4. Select a date range
5. Download the file

### 6.6 User Administration

1. Go to Admin → Users
2. View and edit user profiles
3. Assign roles: End User, IT Agent, IT Manager, Admin
4. Update department, location, or active status

---

## 7. Common Tasks

**Task 1: Handling a Critical System Outage (P1)**

- Ticket auto-classified as P1
- SLA: 1-hour response, 4-hour resolution
- Immediate routing and escalation
- Real-time updates to stakeholders

**Task 2: Bulk Assigning Tickets**

1. Open Team Queue
2. Filter for unassigned tickets
3. Select multiple tickets
4. Assign to an agent using bulk actions

**Task 3: Preventing SLA Breaches**

- Monitor SLA warnings
- Update ticket progress regularly
- Escalate blockers early

**Task 4: Knowledge Base Self-Service**

1. Search for solutions
2. Follow step-by-step articles
3. Resolve issues without creating tickets

---

## 8. Frequently Asked Questions (FAQ)

Detailed answers to common questions about ticket status, priorities, attachments, SLAs, and mobile access.

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
