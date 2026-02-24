# Madison88 ITSM Platform – User Manual

---

## Introduction

The Madison88 IT Service Management (ITSM) Platform is a centralized system for managing IT support tickets, service requests, change requests, and knowledge base articles across the organization. It improves transparency, accountability, and resolution speed for IT-related issues.

This manual provides step-by-step guidance for End Users, IT Agents, and IT Managers.

### Key Benefits
- ✅ Centralized ticketing for all IT requests
- ✅ SLA tracking for response and resolution times
- ✅ Knowledge Base for self-service support
- ✅ Real-time ticket updates and notifications
- ✅ Mobile-responsive design (desktop, tablet, mobile)
- ✅ Reporting and performance visibility
- ✅ Automatic priority detection based on impact
- ✅ Team-based ticket assignment and escalation

---

## 1. Quick Start Guide

### Login

**What it does**: Authenticates your account and gives you access to the platform based on your role (End User, IT Agent, or IT Manager).

**Steps**:
1. Open your browser and go to `https://m88itsm.netlify.app`
2. Enter your Madison88 email address
3. Enter your password
4. Click **Login**

**Notes**:
- You'll see different features based on your role
- Your session lasts until you logout or 24 hours of inactivity
- If you forget your password, click "Reset Password" on the login screen

---

### Create a Ticket

**What it does**: Submits an IT issue, request, or inquiry to the support team. The system automatically assigns a ticket number, calculates priority, and routes it to the appropriate team.

**Steps**:
1. Click **New Ticket** from the left navigation menu
2. (Optional) Select a **Ticket Template** to auto-fill common fields
3. Complete the required fields:
   - **Category**: Hardware, Software, Access Request, Account Creation, Network, Other
   - **Title**: Short issue summary (e.g., "Laptop won't connect to WiFi")
   - **Description**: Detailed explanation of the issue
   - **Business Impact**: How this affects your work (e.g., "Cannot access customer data for 3 hours")
   - **Location**: Philippines, US, Indonesia, or Other
   - **Priority (optional)**: Leave as "Auto" for system to calculate, or select P1-P4 manually
   - **Attachments (optional)**: Screenshots, error logs, or reference files
4. Click **Submit**

**What happens next**:
- System assigns you a unique **Ticket Number** (e.g., #TK-001234)
- System **auto-detects priority** based on keywords:
  - **P1 (Critical)**: Keywords like "outage", "down", "security breach", "data loss"
  - **P2 (High)**: Keywords like "degradation", "slow", "partial outage"
  - **P3 (Medium)**: Keywords like "issue", "problem", "performance"
  - **P4 (Low)**: Keywords like "feature request", "question"
- You receive a **confirmation notification**
- An **IT Agent** is assigned based on category and location
- You can track status in real-time

---

### View Your Tickets

**What it does**: Shows all tickets you've submitted or are assigned to, with status, priority, and SLA countdown.

**Steps**:
1. Click **Tickets** from the left menu
2. Your tickets appear in a list with:
   - **Ticket Number**: Unique identifier (e.g., #TK-001234)
   - **Title**: Issue summary
   - **Status**: New, In Progress, Pending, Resolved, Closed
   - **Priority**: P1-P4 color-coded
   - **SLA Status**: Green (on track), Yellow (approaching deadline), Red (breached)
   - **Created**: When ticket was submitted
   - **Last Updated**: Most recent activity
3. Click any ticket to view full details, comments, and attachments

**Pro Tips**:
- **Filter by Status**: View only Open, Resolved, or Closed tickets
- **Search**: Find tickets by number, title, or keyword
- **Sort**: Click column headers to sort by priority, date, or status

---

### Search the Knowledge Base

**What it does**: Provides self-service access to articles, guides, and solutions for common IT issues. Reduces ticket volume by helping users solve problems independently.

**Steps**:
1. Click **Knowledge Base** from the left menu
2. Search for your issue (e.g., "reset password", "printer setup")
3. (Optional) Apply filters:
   - **Category**: Hardware, Software, Networking, Account, etc.
   - **Difficulty**: Beginner, Intermediate, Advanced
4. Click on an article to view the full solution with steps and screenshots

**What's included in articles**:
- Step-by-step instructions with screenshots
- Common troubleshooting steps
- Links to related articles
- "Still need help?" button to create a ticket from the article

---

## 2. Glossary

| Term | Definition |
|------|-----------|
| **Agent** | An IT support staff member responsible for handling tickets and resolving issues |
| **End User** | Any employee or authorized user who submits a ticket or request |
| **SLA** | Service Level Agreement - the agreed time limits for responding to and resolving tickets |
| **Ticket** | A recorded IT issue, service request, or inquiry submitted through the system |
| **Knowledge Base** | Centralized library of articles, guides, and solutions for common problems |
| **Escalation** | Process of transferring a ticket to a higher support level or manager when needed |
| **Priority** | Urgency level (P1=Critical, P2=High, P3=Medium, P4=Low) |
| **Dashboard** | Visual overview of system status, active tickets, and performance metrics |
| **Attachment** | File (image, document, log) added to a ticket for reference |
| **Queue** | List of tickets assigned to an agent, team, or department |
| **Resolution** | Final solution applied to close a ticket |
| **Internal Note** | Comment visible only to IT staff (not shown to ticket creator) |
| **Public Comment** | Comment visible to both IT staff and end users |
| **Status** | Current state of ticket (New, In Progress, Pending, Resolved, Closed) |
| **Archived User** | User account deactivated by admin (access removed, no longer visible in lists) |
| **Reset Password** | Secure process to recover account access if password is forgotten |

---

## 3. End User Guide

### Creating a Ticket – Detailed Steps

**What this accomplishes**:
- Officially reports your IT issue to the support team
- Creates an audit trail and case number for reference
- Routes your request to the right team based on category and location
- Starts the SLA clock (response and resolution timers)

**Step-by-step**:

1. **Click "New Ticket"** from the left navigation menu
   - You'll see the ticket creation form

2. **Select a Template (Optional)**
   - Choose a pre-filled template for common requests:
     - "Reset Password" (pre-fills category, fields)
     - "Add Software" (has common software list)
     - "Network Issue" (has network troubleshooting checklist)
     - "Hardware Request" (has asset tracking fields)

3. **Fill in Required Fields** (marked with *)
   - **Title**: Be specific (❌ "Help!" vs ✅ "Cannot access SharePoint for past 2 hours")
   - **Description**: Include:
     - What you were trying to do
     - What happened instead
     - When it started
     - How many people affected
   - **Business Impact**: Explain consequences:
     - Example: "Cannot process customer payments, losing $500/hour"
   - **Category**: Pick the best match
   - **Location**: Your office location

4. **Add Context (Optional)**
   - **Attachments**: Upload screenshots, error messages, or files
   - **Additional Details**: Internal notes, error codes, etc.

5. **Priority Settings**
   - **Auto**: System detects priority from keywords (✅ Recommended for most)
   - **Manual**: Force a specific priority (use only if critical)

6. **Click Submit**
   - Ticket is created and assigned

**What you get back**:
- ✅ Confirmation message with Ticket Number (#TK-XXXXX)
- ✅ Email notification with ticket details
- ✅ Real-time status tracking

**Example Ticket**:
```
Title: "ERP System Login Fails with Error 501"
Description: "Since 9:00 AM today, I cannot log into the ERP system. 
Error message: 'Connection refused 501'. I've tried:
1. Clearing browser cache
2. Using different browser (Chrome vs Firefox)
3. Restarting my laptop
All failed."
Business Impact: "Cannot access customer orders. Have 50+ pending orders."
Category: "Software"
Location: "Philippines - Manila"
Attachments: screenshot_error.png, error_log.txt
```

---

### Tracking Your Tickets

**What this shows you**:
- Real-time status of every ticket you've created
- Who's assigned to it and current progress
- How much time remains before SLA deadline
- Estimated resolution date

**How to use**:

1. **Click "Tickets"** from the left menu
2. **View Your Dashboard**:
   - **My Open Tickets**: Active, not yet resolved
   - **My Resolved Tickets**: Closed but not archived
   - **My History**: All tickets ever submitted
3. **Check Status**:
   - 🟢 **New**: Just created, awaiting assignment
   - 🟡 **In Progress**: Agent is actively working on it
   - 🟠 **Pending**: Waiting for your input or external action
   - 🟢 **Resolved**: Fixed and awaiting your confirmation
   - ⚫ **Closed**: Complete and archived

4. **Monitor SLA**:
   - Green bar = On track
   - Yellow bar = 80%+ of time used
   - Red bar = Deadline passed
   - Timer shows hours/minutes remaining

---

### Communicating on Tickets

**What this does**:
- Allows you to send messages to the support team without creating multiple tickets
- Creates a permanent record of all communications
- Keeps everyone updated on the same page

**How to comment**:

1. **Open a Ticket** from the Tickets list
2. **Scroll to the "Comments" section** at the bottom
3. **Type your message**:
   - Ask for clarification
   - Provide additional information
   - Confirm that a solution worked
4. **Click "Post Comment"**

**Best practices**:
- ✅ Be specific and provide context
- ✅ Include error messages or screenshots if needed
- ✅ Reply quickly to agent requests for info
- ❌ Don't create a new ticket if you can comment instead
- ❌ Avoid personal or sensitive information in comments

**Example comment**:
```
"Thanks for the quick response! I tried the steps you suggested:
1. Cleared cache ✓ (no change)
2. Disabled VPN ✓ (WORKED!)
3. Still works after re-enabling VPN ✓

Looks like a firewall rule issue with our VPN. Can you check 
that on your end?"
```

---

### Uploading Attachments

**What this does**:
- Sends evidence (screenshots, logs, files) to help agents diagnose your issue faster
- Creates a visual record without lengthy descriptions
- Can include code, configuration files, or other documentation

**How to upload**:

1. **Open a Ticket** or **Create a New Ticket**
2. **Go to "Attachments" section**
3. **Click "Add Attachment"** or drag & drop files
4. **Select a file** from your computer
   - Supported: .jpg, .png, .pdf, .txt, .docx, .xlsx, .zip
   - Max size: 25MB per file, 100MB total
5. **Click Upload** or let it auto-upload

**What to attach**:
- ✅ Error message screenshots
- ✅ System logs (from Event Viewer, syslog, etc.)
- ✅ Configuration files
- ✅ Performance data (Task Manager, resource monitor)
- ❌ Passwords or sensitive credentials
- ❌ Video files (too large, use screenshots instead)

**Example attachments**:
- `error_screenshot.png` - Shows the exact error message
- `system_log.xlsx` - Performance data before/after issue
- `network_trace.txt` - Network diagnostic results

---

### Using the Knowledge Base

**What this accomplishes**:
- Solves common issues **without waiting for an agent** (instant help)
- Reduces support ticket load by encouraging self-service
- Provides official solutions and best practices
- Helps prevent the same issue from happening again

**How to search**:

1. **Click "Knowledge Base"** from the left menu
2. **Search**:
   - Type a keyword (e.g., "reset password", "printer driver")
   - Or browse categories (Hardware, Software, Network, etc.)
3. **View Results** with:
   - Article title
   - Category
   - Read time estimate
   - Relevance score
4. **Click an article** to view full content

**Article contents typically include**:
- Problem description
- Step-by-step solution
- Screenshots with annotations
- Common troubleshooting steps
- "Still stuck?" → Create Ticket button
- Related articles

**Example: "Reset Your Password"**
```
PROBLEM: "You can't remember your password or account is locked"

SOLUTION:
1. Go to login page → Click "Forgot Password"
2. Enter your email address
3. Check email for reset link (valid for 24 hours)
4. Click link and create new password (min 8 characters)
5. Log in with new password

TROUBLESHOOTING:
Q: "I didn't receive the reset email"
A: Check spam folder, or wait 5 minutes and retry

Q: "Reset link expired"
A: Start over and request a new one

RELATED ARTICLES:
- How to Create a Strong Password
- Two-Factor Authentication Setup
```

---

## 4. IT Agent Guide

### What IT Agents Do

IT Agents are support staff who:
- ✅ Review and accept newly created tickets
- ✅ Diagnose and troubleshoot issues
- ✅ Provide solutions or escalate to specialists
- ✅ Update ticket status and communicate progress
- ✅ Escalate P1/P2 tickets to managers
- ✅ Create internal notes for team reference
- ✅ Close resolved tickets after user confirmation

### Key Dashboard Elements

**Tickets Queue**:
- **Assigned to Me**: Active tickets assigned to your name
- **Unassigned**: New tickets waiting for an agent to accept
- **My Team**: Tickets assigned to your team
- **Escalations**: Tickets approaching or past SLA deadline

**Status Options**:
- 🟢 **New** → **In Progress**: You start working
- 🟡 **In Progress** → **Pending**: Waiting for user response
- 🟠 **Pending** → **In Progress**: User responded, continue work
- 🟢 **In Progress** → **Resolved**: Solution implemented, awaiting confirmation
- ⚫ **Resolved** → **Closed**: User confirmed fix, ticket complete

**SLA Tracking**:
- P1: 1 hour response, 4 hour resolution
- P2: 4 hour response, 24 hour resolution
- P3: 8 hour response, 48 hour resolution
- P4: 24 hour response, 5 day resolution

### Key Functions

1. **Accept a Ticket**
   - Click "Assign to Me" to accept from unassigned queue
   - Ticket moves to "Assigned to Me"
   - SLA timer starts

2. **Update Status**
   - Change from New → In Progress → Resolved → Closed
   - Click status dropdown and select new status

3. **Use Internal vs Public Comments**
   - **Internal Notes** (Private): Visible only to IT staff
     - Examples: "User had wrong config", "Escalate device to hardware team"
   - **Public Comments**: Visible to user
     - Examples: "Please restart and try again", "Issue resolved, please confirm"

4. **Escalate Priority**
   - Click "Escalate" if issue is more critical than initially assigned
   - Notifies team lead and updates SLA

5. **Create Escalations** (for P1/P2 tickets)
   - Automatic: If ticket approaching 90% of SLA time
   - Manual: Click "Escalate" to move to manager

---

## 5. IT Manager Guide

### What IT Managers Do

IT Managers:
- ✅ Oversee agent performance and ticket quality
- ✅ Manage team assignments and workload
- ✅ Handle escalated tickets (P1/P2)
- ✅ Configure SLA rules and policies
- ✅ Generate reports and performance metrics
- ✅ Manage change requests and approvals
- ✅ Manage team members and permissions

### Dashboard Overview

**Executive View**:
- Total open tickets by priority (P1, P2, P3, P4)
- SLA compliance percentage (% of tickets resolved on time)
- Escalations in progress
- Team workload distribution
- Average resolution time per category

**Key Metrics**:
- 📊 **Issue Volume**: Tickets created today/week/month
- ⏱️ **Avg Resolution Time**: How long tickets typically take
- 📈 **SLA Compliance**: % meeting deadline (target: > 95%)
- 👥 **Team Utilization**: Tickets per agent (should be balanced)
- 🚨 **Escalations**: P1/P2 tickets needing attention

### Team Management

1. **Assign Tickets to Agents**
   - View unassigned queue
   - Drag-and-drop to assign to specific agent
   - Auto-assign based on category/location/expertise

2. **Monitor Agent Performance**
   - Tickets resolved per agent
   - Average resolution time
   - SLA compliance rate
   - Customer satisfaction rating

3. **Handle Escalations**
   - P1 tickets auto-escalate after 3.6 hours (90% of 4-hour SLA)
   - P2 tickets auto-escalate after 21.6 hours (90% of 24-hour SLA)
   - Review escalation reason and take action

### Configuration & Administration

1. **SLA Rules**
   - Set response times per priority level
   - Adjust escalation thresholds (currently 90%)
   - Configure business hours vs 24/7

2. **Change Management**
   - Review and approve change requests
   - Schedule maintenance windows
   - Track change implementation and rollback

3. **User Administration**
   - Create/deactivate user accounts
   - Assign roles (End User, Agent, Manager)
   - Manage team memberships
   - Archive inactive users

---

## 6. Features & What They Do

### 🎫 Ticket Management System

**What it does**: Centralized system for tracking all IT issues and requests from submission to resolution.

**Key features**:
- Auto-numbering (TK-001234, TK-001235, etc.)
- Automatic priority detection from description
- SLA countdown timer
- Automatic assignment based on category/location
- Attachment storage (screenshots, logs, files)
- Comment history for auditing
- Status tracking (New → In Progress → Resolved → Closed)
- Escalation to manager if nearing deadline

**Why it matters**: No more scattered emails or lost requests. Everything's tracked and accountable.

---

### 📊 Real-Time Dashboard

**What it does**: Displays live metrics and status of all tickets, including P1 breaches and team performance.

**Shows**:
- Number of P1/P2/P3/P4 tickets open right now
- SLA breaches (tickets past deadline, color-coded red)
- Escalations that need attention
- Team workload distribution
- Average resolution time
- Total customer impact

**Why it matters**: Managers can see at a glance what needs immediate attention.

---

### 📚 Knowledge Base

**What it does**: Self-service library of articles, guides, and solutions. Reduces support tickets by solving common issues instantly.

**Includes**:
- Searchable articles (with keyword indexing)
- Screenshots and video guides
- Categorized by department/topic
- "Related articles" links
- Read time estimates
- View count and helpfulness ratings
- Links to create tickets from articles

**Why it matters**: Users can solve problems in 5 minutes instead of waiting 2+ hours for an agent.

---

### 🔔 Notifications System

**What it does**: Real-time alerts when important events happen (ticket assigned, comment received, SLA approaching, etc.).

**Types of notifications**:
- 📌 **Ticket Assigned**: Agent assigned to your ticket
- 💬 **New Comment**: Someone responded to your ticket
- ⚠️ **SLA Warning**: Approaching deadline (80%+ of time used)
- 🚨 **Critical Ticket**: P1 ticket opened (sent to team)
- ✅ **Resolution Pending**: Solution provided, awaiting your confirmation
- 📝 **Status Update**: Ticket status changed
- 🔐 **Password Reset**: Link to reset your password

**Delivery methods**:
- 📱 In-app notifications (bell icon)
- 📧 Email notifications (if enabled)
- 🔔 Email alerts for P1 tickets (critical)

**Why it matters**: You stay informed without constantly checking the platform.

---

### 👥 User Management

**What it does**: Admin controls for creating/deactivating accounts, assigning roles, and managing permissions.

**Features**:
- Create new user accounts
- Assign roles: End User, IT Agent, IT Manager, System Admin
- Manage team assignments
- Reset passwords for users
- Deactivate/archive inactive users (removes access, keeps data)
- View user activity and ticket history
- Manage department and location assignments

**Why it matters**: Admins maintain access control and data organization.

---

### 🔄 Auto-Escalation System

**What it does**: Automatically escalates tickets approaching SLA deadline to manager attention.

**How it works**:
- Runs every 5 minutes in background
- Monitors all open tickets (status: New, In Progress, Pending)
- When ticket reaches 90% of SLA time:
  - Auto-creates escalation record
  - Notifies team lead/manager
  - Marks ticket as "Escalated" in red
  - Suggests prioritization actions

**SLA thresholds**:
- P1 (4hr resolution): Escalates at 3.6 hours
- P2 (24hr resolution): Escalates at 21.6 hours
- P3 (48hr resolution): Escalates at 43.2 hours
- P4 (5day resolution): Escalates at 4.3 days

**Why it matters**: Prevents SLA breaches and ensures urgent tickets get management attention.

---

### 📧 Email Notifications & Password Reset

**What it does**: Sends automated emails for important events and allows secure password recovery.

**Email includes**:
- Ticket details and assignment info
- Direct link to ticket in platform
- SLA deadline and countdown
- Agent contact info
- "Reply to ticket" option

**Password Reset**:
- User clicks "Forgot Password" on login
- Receives secure reset link (valid 24 hours)
- User sets new password
- Link becomes invalid after use
- Confirmation email sent

**Why it matters**: Users stay connected even without logging in, and can securely recover access.

---

### 🔐 Role-Based Access Control

**What it does**: Different users see different features based on their role.

**Role permissions**:

| Feature | End User | Agent | Manager | Admin |
|---------|----------|-------|---------|-------|
| Create Ticket | ✅ | ✅ | ✅ | ✅ |
| View Own Tickets | ✅ | ✅ | ✅ | ✅ |
| View All Tickets | ❌ | ✅ | ✅ | ✅ |
| Update Ticket Status | ❌ | ✅ | ✅ | ✅ |
| Create Internal Notes | ❌ | ✅ | ✅ | ✅ |
| Escalate Tickets | ❌ | ⚠️ Manual | ✅ | ✅ |
| Configure SLA Rules | ❌ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ⚠️ Team | ✅ |
| View Reports | ❌ | ❌ | ✅ | ✅ |

**Why it matters**: Security and organization. Each role sees only what they need.

---

### 📋 Ticket Templates

**What it does**: Pre-filled forms for common requests, saving time and ensuring consistency.

**Common templates**:
- **Reset Password**: Auto-fills category, priority, description template
- **Software Installation**: Lists common software with checkboxes
- **Hardware Issue**: Includes device type, OS, symptoms checklist
- **Network Connectivity**: Troubleshooting steps and connectivity info
- **Account Access Request**: Department, system, access level dropdowns

**Why it matters**: 30 seconds to fill out a template vs 5+ minutes typing a full description.

---

### 🏢 Multi-Location Support

**What it does**: Routes tickets to the appropriate team based on user location.

**Locations**:
- Philippines (Manila, Cebу)
- United States (East, West Coast)
- Indonesia (Jakarta, Surabaya)
- Other

**Automatically**:
- Assigns to local team
- Displays local support hours
- Tracks location-specific metrics

**Why it matters**: Ensures users get support in their timezone with local expertise.

---

### 🔄 Ticket Status Workflow

**What it does**: Tracks ticket progress through standard lifecycle.

**Status progression**:

```
New (just created)
  ↓
In Progress (agent working on it)
  ↓
Pending (waiting for user response or external action)
  ↓
In Progress (continued work)
  ↓
Resolved (solution provided, awaiting user confirmation)
  ↓
Closed (user confirmed fix, ticket archived)
```

**At any point**:
- Can move back to In Progress if more work needed
- Can escalate to higher priority
- Can add comments and attachments
- SLA timer tracks total time

**Why it matters**: Clear visibility into ticket progress and expected timeline.

---

## 7. Common Tasks

### Handling Critical Incidents (P1)

**P1 tickets**:
- Response deadline: **1 hour**
- Resolution deadline: **4 hours**
- Auto-escalates at: **3.6 hours** (90%)

**What happens automatically**:
1. Ticket created with P1 priority
2. Critical notice sent to entire assigned team (email + notification)
3. Appears at top of agent queue (red priority)
4. Dashboard alerts manager immediately
5. If not resolved by 3.6 hours: Auto-escalated to manager

**What to do**:
1. Read ticket immediately
2. Accept ticket ("Assign to Me")
3. Contact user immediately (phone if available, email second)
4. Update ticket with findings every 15-30 minutes
5. If you can't resolve in 30 min: Escalate to expert
6. Confirm resolution with user before closing

**Example P1 keywords** that trigger critical handling:
- "outage" → P1
- "down" → P1
- "security breach" → P1
- "data loss" → P1
- "critical" → P1

---

### Preventing SLA Breaches

**SLA** = Service Level Agreement (response + resolution deadline)

**How to avoid breaches**:

1. **Accept tickets quickly** (within 30 min of assignment)
2. **Respond to users** within SLA response time
   - P1: Within 1 hour
   - P2: Within 4 hours
   - P3: Within 8 hours
   - P4: Within 24 hours
3. **Escalate early** if you can't resolve
   - If stuck > 1 hour on P1: Escalate immediately
   - If stuck > 4 hours on P2: Escalate to manager
4. **Monitor SLA countdown** (red timer = danger zone)

**Manager actions to prevent breaches**:
- Monitor dashboard for yellow/red SLA indicators
- Escalate yellow tickets to team
- Reassign if agent overwhelmed
- Add additional resources for P1/P2 spikes

---

### Promoting Self-Service (Knowledge Base)

**Goal**: Reduce support tickets by 30-50% by helping users solve problems without agent help.

**How to build KB**:
1. Analyze most common tickets
2. Create articles with solutions
3. Link from related tickets
4. Promote in notifications
5. Track KB engagement metrics (searches, reads, solutions)

**Best practices**:
- ✅ Add screenshots with annotations
- ✅ Include troubleshooting decision trees
- ✅ Keep articles short (2-5 min read time)
- ✅ Update when procedures change
- ❌ Don't create article for one-off issues
- ❌ Don't include outdated solutions

**Top KB articles to create first**:
1. "Reset Your Password"
2. "Printer Setup Guide"
3. "VPN Connection Issues"
4. "Slack/Teams Troubleshooting"
5. "Request Software Installation"

---

## 8. Frequently Asked Questions (FAQ)

### General Questions

**Q: What is SLA?**
A: Service Level Agreement - the promised time we'll respond to and resolve your ticket. Based on priority (P1 = 1 hour response, P2 = 4 hours, etc.). Red SLA timer means deadline approaching.

**Q: How is my ticket priority assigned?**
A: Automatically detected from keywords in your description:
- "Outage", "down", "breach" → P1 (critical)
- "Degradation", "slow" → P2 (high)
- "Issue", "problem" → P3 (medium)
- "Question", "feature request" → P4 (low)

You can override priority if you want, but auto-detection is usually accurate.

**Q: Why is my ticket taking so long?**
A: Possible reasons:
1. Low priority (P4 = 5 day deadline)
2. Queued behind urgent tickets (P1/P2)
3. Needs your input (Pending status)
4. Requires specialist (escalated to higher tier)

Check the SLA timer to see how much time remains. Comment asking for update if no activity in 24 hours.

---

### Ticket & Resolution

**Q: Can I edit a ticket after creation?**
A: Limited edits:
- ✅ Add attachments or comments
- ✅ Update description with additional info
- ❌ Can't change category or priority (contact agent to escalate)
- ❌ Can't delete resolved tickets (audit trail)

**Q: What happens after my ticket is resolved?**
A: Agent marks as "Resolved" with solution. You receive notification asking to confirm fix worked. If yes, ticket auto-closes 24 hours later. If no, agent reopens for more work.

**Q: How long are closed tickets kept?**
A: Indefinitely. Closed tickets remain searchable for reference, but archived from active queues. Managers can run reports on historical tickets.

**Q: What if my issue isn't IT-related?**
A: Create ticket anyway. Agent will check and may redirect to:
- HR department
- Facilities
- Finance
- Other teams

Better to submit and redirect than guess wrong department.

---

### Files & Attachments

**Q: What files can I attach?**
A: Supported:
- ✅ Images (.jpg, .png, .gif)
- ✅ Documents (.pdf, .docx, .xlsx, .txt)
- ✅ Archives (.zip, .rar)
- ✅ Logs (.log, .txt)
- ❌ Executables (.exe, .bat)
- ❌ Scripts (.ps1, .cmd)
- ❌ Videos (too large)

Max 25MB per file, 100MB total per ticket.

**Q: My password is in a file—is it safe to attach?**
A: NO! Never attach passwords, API keys, or credentials. Never. Instead:
- Tell agent "credentials sent separately via secure encrypted email"
- Use password manager link
- Contact agent directly by phone

**Q: Can I attach previous ticket numbers?**
A: Yes! Instead of reuploading files:
- "See attached screenshot in ticket #TK-001000"
- Agents can view previous ticket history

---

### Mobile & Access

**Q: Can I access this on mobile/tablet?**
A: Yes! Platform is fully responsive:
- ✅ Works on phone browsers (portrait + landscape)
- ✅ All features work on tablets
- ❌ No native mobile app yet (browser is recommended)

**Q: Can I access this offline?**
A: Limited offline:
- ✅ Can view previously loaded pages
- ❌ Creating/updating requires internet
- ❌ Real-time notifications only work online

Recommendation: Don't rely on offline. Keep browser tab open.

**Q: What's my session timeout?**
A: Automatic logout after:
- 24 hours of login, or
- 30 minutes of inactivity

If logged out, just login again. Your tickets and data are saved.

---

### Escalation & Management

**Q: When does a ticket escalate?**
A: Automatic escalation when:
- Ticket reaches 90% of SLA time without resolution
  - P1: At 3.6 hours (deadline 4 hours)
  - P2: At 21.6 hours (deadline 24 hours)
- Agent manually escalates to higher priority
- Manager reassigns to different team/specialist

**Q: Can I escalate my own ticket?**
A: Partially:
- ✅ Can comment "This is more urgent than P4"
- ✅ Agent may raise priority
- ❌ Can't directly change priority
- System will auto-escalate if nearing deadline

**Q: What happens when a ticket escalates?**
A: Escalation record created showing:
- Reason for escalation
- Which team/manager it went to
- Original deadline and time used
- Escalation timestamp

Manager gets alert and takes priority action. Rest continues as normal ticket.

---

### Account & Security

**Q: I forgot my password—what do I do?**
A: 
1. Click "Forgot Password" on login screen
2. Enter your email
3. Check email for reset link (valid 24 hours)
4. Click link and create new password
5. Login with new password

Link is one-time use and expires in 24 hours for security.

**Q: What if I don't get the reset email?**
A: 
1. Check spam/junk folder (sometimes filtered)
2. Wait 5 minutes and request new link
3. Contact IT support directly: it-support@madison88.com

**Q: Is my data private?**
A: Data privacy:
- ✅ Your tickets visible only to you + IT staff assigned
- ✅ Passwords encrypted in database
- ✅ Email is HTTPS secure
- ✅ Audit trail of all access
- ⚠️ IT staff can see all tickets when debugging (for support)
- ⚠️ Managers can see all team tickets

Don't put sensitive customer data in tickets. Use general descriptions instead.

**Q: Can I delete my account?**
A: No direct deletion because:
- Tickets are audit trails (required for compliance)
- Data linked to historical tickets
- User accounts kept for reporting

Instead: Admin deactivates your account (removes access, keeps data archived).

---

### System & Features

**Q: What if I find a bug?**
A: Report immediately:
- Email: it-support@madison88.com
- Subject: "BUG REPORT: [describe issue]"
- Include:
  - Browser type (Chrome, Firefox, Safari, Edge)
  - Device (phone, tablet, laptop)
  - Steps to reproduce
  - Screenshot if possible

**Q: Is there a mobile app?**
A: Not yet. Browser is optimized for mobile:
- Responsive design
- Touch-friendly buttons
- Mobile-optimized views
- Bookmarks work on home screen

Native app planned for future release.

**Q: How do I get trained on this system?**
A: Available training:
- **This user manual** (read section for your role)
- **YouTube tutorials** (planned)
- **Live training sessions** (scheduled monthly)
- **One-on-one help** (contact it-support@madison88.com)

---

## 9. Troubleshooting Flowchart

```
User has an issue
         ↓
Can you find solution in Knowledge Base?
    ↙ Yes             ↘ No
Use solution     Do you need help?
   ↓                    ↓
Issue resolved?   Create a Ticket
  ✅/❌           ↓
              Agent receives ticket
              ↓
           Agent diagnoses issue
              ↓
        Can agent fix it?
       ✅ Yes      ❌ No
         ↓           ↓
      Apply      Escalate to
     solution    Specialist/Manager
         ↓           ↓
    Confirm       More actions
   with user      ↓
     ↓         Issue resolved?
  Closed?      ✅ / ❌
    ↓            ↓
  Done      Repeat as needed
```

---

## 10. Tips & Best Practices

### For End Users

✅ **DO**:
- Search Knowledge Base first (80% of issues self-solvable)
- Be specific in ticket title and description
- Attach relevant screenshots or error logs
- Respond quickly to agent requests
- Confirm resolution before closing

❌ **DON'T**:
- Create multiple tickets for same issue
- Share passwords via ticket comments
- Attach video files (use screenshot instead)
- Demand specific SLA times (they're published already)
- Close ticket if issue recurring

---

### For IT Agents

✅ **DO**:
- Accept unassigned tickets quickly
- Respond within SLA response time
- Provide clear step-by-step instructions
- Use internal notes for team collaboration
- Escalate early if stuck

❌ **DON'T**:
- Keep ticket in "In Progress" for > 8 hours without update
- Close tickets without user confirmation
- Create duplicate tickets
- Make assumptions—ask clarifying questions first

---

### For IT Managers

✅ **DO**:
- Review SLA compliance daily
- Redistribute workload if agents overwhelmed
- Escalate P1/P2 tickets personally
- Review knowledge base monthly for gaps
- Celebrate SLA breach-free weeks with team

❌ **DON'T**:
- Accept tickets as manager (let agents handle)
- Close tickets without agent review
- Ignore yellow/red SLA warnings
- Schedule maintenance during peak hours

---

## 11. Support & Contact

For issues with the ITSM platform:

**📧 Email**: it-support@madison88.com
**📱 Phone**: +63-2-XXXX-XXXX (Philippines)
**⏰ Support Hours**: 8:00 AM – 6:00 PM (Local Time), Monday–Friday
**🌐 Platform**: https://m88itsm.netlify.app

**Response times**:
- Urgent (can't access platform): 15 minutes
- Normal questions: 2 hours
- Feature requests: 24 hours

---

## 12. Document Information

**Document Title**: Madison88 ITSM Platform User Manual
**Version**: 2.0
**Last Updated**: February 24, 2026
**Next Review**: May 24, 2026

**Editors**: 
- Replace all [Insert Screenshot: …] with real screenshots
- Use tables and bullet points for readability
- Apply company branding and logo
- Keep language simple and user-friendly
- Update when features change
