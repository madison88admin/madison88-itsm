# User Activity Logging Setup Guide

## 📋 Quick Setup (5 minutes)

This guide walks you through setting up real-time user activity logging and monitoring.

---

## Step 1: Apply Database Migration

Run the SQL migration to create the activity logs table:

```bash
# Using psql directly
psql "YOUR_DATABASE_URL" < database/migrations/2026-02-24_user_activity_logs.sql

# Or if using Supabase UI
# 1. Go to https://app.supabase.com → Your Project → SQL Editor
# 2. Copy entire content from database/migrations/2026-02-24_user_activity_logs.sql
# 3. Click "Run"
```

**What this creates:**
- ✅ `user_activity_logs` table with proper indexes
- ✅ `active_users_view` for quick access
- ✅ `user_sessions_view` for session info
- ✅ `daily_activity_summary` for stats

---

## Step 2: Verify Backend Files Added

Check these files exist in your backend:

```
backend/src/
├── services/
│   └── user-activity.service.js        ✅ NEW
├── controllers/
│   └── user-activity.controller.js     ✅ NEW
├── routes/
│   └── user-activity.routes.js         ✅ NEW
└── controllers/
    └── auth.controller.js              ✅ UPDATED (login/logout logging)
```

**Already done?** Skip to Step 3.

---

## Step 3: Verify Frontend Files Added

Check these files exist in your frontend:

```
frontend/src/pages/
├── AdminActivityMonitor.jsx            ✅ NEW
└── AdminActivityMonitor.css            ✅ NEW
```

---

## Step 4: Test the Setup

### 4a. Test Login Logging

```bash
# 1. Start backend
cd backend
npm start

# 2. In browser, login with a test account
# 3. Check logs - you should see:
#    "User {userId} logged in"
```

### 4b. Test Activity Endpoint

```bash
# Get active users (need valid JWT token)
curl -X GET \
  'http://localhost:3001/api/admin/active-users' \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response should show:
{
  "status": "success",
  "data": {
    "count": 1,
    "activeUsers": [
      {
        "user_id": "...",
        "email": "admin@madison88.com",
        "full_name": "Admin User",
        "last_activity": "2026-02-24T10:30:45Z",
        "minutes_since_activity": 2
      }
    ]
  }
}
```

### 4c. Test Activity Logs Endpoint

```bash
curl -X GET \
  'http://localhost:3001/api/admin/activity-logs?activityType=LOGIN' \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Step 5: Add Activity Monitoring to Admin Dashboard

### Option A: Add to Existing Admin Section

In your admin navigation (e.g., `AdminPanel.jsx`):

```jsx
import AdminActivityMonitor from '../pages/AdminActivityMonitor';

// In your router
<Route 
  path="/admin/activity-monitor" 
  element={<AdminActivityMonitor user={user} />} 
/>

// In your admin menu
<Link to="/admin/activity-monitor">📊 Activity Monitor</Link>
```

### Option B: Standalone Page

Create `frontend/src/pages/AdminActivityMonitor.jsx` and navigate to:
```
http://localhost:3000/admin/activity-monitor
```

---

## Step 6: Add Activity Logging to Other Features (Optional)

### Log Ticket Creation

In `backend/src/controllers/tickets.controller.js`:

```javascript
const UserActivityService = require('../services/user-activity.service');

// After creating a ticket
await UserActivityService.logActivity(
  req.user.user_id,
  'TICKET_CREATE',
  newTicket.ticket_id,
  'TICKET',
  { category: newTicket.category, priority: newTicket.priority }
);
```

### Log Ticket Comments

In `backend/src/controllers/ticket-comments.controller.js`:

```javascript
// After adding a comment
await UserActivityService.logActivity(
  req.user.user_id,
  'COMMENT',
  ticketId,
  'TICKET',
  { comment_length: comment.content.length }
);
```

### Log Ticket Views

In `backend/src/controllers/tickets.controller.js`:

```javascript
// In the getTicket method
await UserActivityService.logActivity(
  req.user.user_id,
  'TICKET_VIEW',
  ticketId,
  'TICKET',
  { status: ticket.status }
);
```

---

## Features You Get

### 1. Real-Time User Monitoring
- See who's logged in right now
- Track last activity time
- View IP addresses and locations

### 2. Activity Audit Trail
- All logins/logouts logged automatically
- All user actions can be logged
- Timestamps and details captured
- Searchable logs

### 3. Admin Dashboard
- Active users tab with refresh intervals
- Activity logs with filters
- Statistics by activity type and period
- Mobile-responsive design

---

## What Gets Logged Automatically

### ✅ Without Any Code Changes
- User logins (email, password)
- User logouts
- IP address
- User agent (browser info)
- Timestamp

### ⚠️ Requires Code Changes
- Ticket views
- Ticket creation
- Comments added
- Attachments uploaded
- Status changes
- Searches performed

---

## Database Queries You Can Run

### See Active Users
```sql
SELECT * FROM active_users_view;
```

### See Login History
```sql
SELECT * FROM user_activity_logs
WHERE activity_type IN ('LOGIN', 'LOGOUT')
ORDER BY activity_timestamp DESC
LIMIT 50;
```

### See Today's Activity
```sql
SELECT activity_type, COUNT(*) as count
FROM user_activity_logs
WHERE DATE(activity_timestamp) = TODAY()
GROUP BY activity_type;
```

---

## Troubleshooting

### Error: "user_activity_logs table does not exist"

**Solution:** Apply the migration
```bash
psql "YOUR_DATABASE_URL" < database/migrations/2026-02-24_user_activity_logs.sql
```

### Error: "UserActivityService is not defined"

**Solution:** Check import in auth.controller.js:
```javascript
const UserActivityService = require('../services/user-activity.service');
```

### Activity logs endpoint returns 403

**Solution:** Need system_admin or it_manager role. Check your token has correct role.

### Too many logs accumulating

**Solution:** Purge old logs
```bash
curl -X POST \
  'http://localhost:3001/api/admin/purge-logs' \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "daysOld": 90 }'
```

---

## API Endpoints Created

All require authentication with system_admin or it_manager role:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/active-users` | GET | Get users logged in last 15 min |
| `/api/admin/activity-logs` | GET | Get filtered activity logs |
| `/api/admin/user-activity/:userId` | GET | Get user's activity history |
| `/api/admin/user-session/:userId` | GET | Get user's session info |
| `/api/admin/activity-stats` | GET | Get activity statistics |
| `/api/admin/purge-logs` | POST | Delete old logs |

---

## Files Created/Modified

### Created
- ✅ `backend/src/services/user-activity.service.js` (273 lines)
- ✅ `backend/src/controllers/user-activity.controller.js` (150 lines)
- ✅ `backend/src/routes/user-activity.routes.js` (45 lines)
- ✅ `frontend/src/pages/AdminActivityMonitor.jsx` (280 lines)
- ✅ `frontend/src/pages/AdminActivityMonitor.css` (450 lines)
- ✅ `database/migrations/2026-02-24_user_activity_logs.sql`
- ✅ `documentation/USER_ACTIVITY_LOGGING.md`

### Modified
- ✅ `backend/src/controllers/auth.controller.js` (added login/logout logging)
- ✅ `backend/src/app.js` (added route registration)

---

## Next Steps

1. ✅ [Apply migration](#step-1-apply-database-migration)
2. ✅ [Test login logging](#step-4-test-the-setup)
3. ✅ [Add monitoring to admin dashboard](#step-5-add-activity-monitoring-to-admin-dashboard)
4. ⚠️ [Optional: Log other activities](#step-6-add-activity-logging-to-other-features-optional)
5. 📊 Start monitoring!

---

## Example Dashboard Views

### Active Users View
```
👥 Active Users (3)
├─ John Smith (IT Agent) - Last 2 min - 192.168.1.100
├─ Jane Doe (IT Manager) - Last 5 min - 192.168.1.101
└─ Bob Johnson (End User) - Last 8 min - 192.168.1.102
```

### Activity Logs View
```
Timestamp          | User          | Activity      | IP Address      | Location
2026-02-24 10:30   | John Smith    | LOGIN         | 192.168.1.100   | Philippines
2026-02-24 10:25   | Jane Doe      | TICKET_CREATE | 192.168.1.101   | US
2026-02-24 10:20   | Bob Johnson   | COMMENT       | 192.168.1.102   | Indonesia
```

### Statistics View
```
LOGIN           LOGOUT          TICKET_CREATE   COMMENT
342             340             125             450
235 users       235 users       98 users        156 users
```

---

## Support

Questions? Check the full documentation at:
- `documentation/USER_ACTIVITY_LOGGING.md`

Or email: it-support@madison88.com
