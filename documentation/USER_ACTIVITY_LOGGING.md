# User Activity Logging & Real-Time Monitoring Guide

## Overview

This document describes the user activity logging system that tracks real-time logins, logouts, and user activities. Administrators can monitor active users and view detailed activity logs.

---

## Features

### 1. **Login/Logout Tracking**
- Automatically logs when users log in and out
- Captures IP address and browser/device information
- Tracks user location (if provided)
- Timestamps for each activity

### 2. **Activity Logging**
Supports tracking these activity types:
- `LOGIN` - User logged in
- `LOGOUT` - User logged out
- `TICKET_VIEW` - Viewed a ticket
- `TICKET_CREATE` - Created a new ticket
- `COMMENT` - Added a comment to a ticket
- `SEARCH` - Performed a search
- `ATTACHMENT` - Uploaded an attachment
- `ESCALATION` - Escalated a ticket
- `STATUS_CHANGE` - Changed ticket status

### 3. **Real-Time Monitoring Dashboard**
- See all active users (logged in within last 15 minutes)
- View detailed activity logs with filtering
- Monitor activity statistics by period
- Auto-refresh with configurable intervals

---

## Database Schema

### Table: `user_activity_logs`

```sql
CREATE TABLE user_activity_logs (
  activity_id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  activity_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  resource_type VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  location VARCHAR(100),
  activity_details JSONB,
  activity_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes (Performance)
- `idx_user_activity_user_id` - Quick lookup by user
- `idx_user_activity_timestamp` - Sort by time
- `idx_user_activity_type` - Filter by activity type
- `idx_user_activity_login_logout` - Fast login/logout queries

### Views
- **`active_users_view`** - Users logged in within 15 minutes
- **`user_sessions_view`** - User session summaries
- **`daily_activity_summary`** - Daily activity aggregates

---

## API Endpoints

### 1. Get Active Users
```
GET /api/admin/active-users
Query Parameters:
  - withinMinutes (default: 15) - Activity window in minutes
Response: Array of active users with their last activity
```

### 2. Get Activity Logs
```
GET /api/admin/activity-logs
Query Parameters:
  - activityType (optional) - Filter by activity type
  - userId (optional) - Filter by user
  - role (optional) - Filter by user role
  - startDate (optional) - Filter by start date
  - endDate (optional) - Filter by end date
  - limit (default: 100) - Max records
  - offset (default: 0) - Pagination offset
Response: Filtered activity logs
```

### 3. Get User Activity History
```
GET /api/admin/user-activity/:userId
Query Parameters:
  - limit (default: 100) - Max records
Response: All activities for a specific user
```

### 4. Get User Session Info
```
GET /api/admin/user-session/:userId
Response: Current session info including last login/logout
```

### 5. Get Activity Statistics
```
GET /api/admin/activity-stats
Query Parameters:
  - period (default: '24_hours') - Options: '24_hours', '7_days', '30_days'
Response: Activity counts by type and user
```

### 6. Purge Old Logs
```
POST /api/admin/purge-logs
Body: { daysOld: 90 }
Response: Number of deleted records
```

---

## Using the Activity Monitoring Dashboard

### Access
Administrators can access the monitoring dashboard at:
```
/admin/activity-monitor
```

### Features

#### Active Users Tab
- **Real-time display** of logged-in users
- **Color-coded status**: 🟢 Active (< 5 min), 🟡 Idle (> 5 min)
- **User details**: Email, role, location, IP address
- **Auto-refresh**: Configurable (10s, 30s, 1min, 5min)

#### Activity Logs Tab
- **Detailed audit trail** of all user activities
- **Filters**:
  - User ID
  - Activity type (Login, Create, Comment, etc.)
  - User role
- **Sortable table** with timestamp, user, activity, IP, location

#### Statistics Tab
- **Activity counts** by type (LOGIN, TICKET_CREATE, COMMENT, etc.)
- **Unique users** per activity type
- **Days active** for each activity type
- **Period selection**: 24hrs, 7 days, 30 days

---

## Implementation Guide

### 1. Enable Activity Logging in Login

The system automatically logs logins. In `auth.controller.js`:

```javascript
// After successful login
await UserActivityService.logLogin(user.user_id, ipAddress, userAgent, location);
```

### 2. Enable Activity Logging in Logout

The system automatically logs logouts. In `auth.controller.js`:

```javascript
// After logout
await UserActivityService.logLogout(userId);
```

### 3. Log Custom Activities

To log activities in other controllers:

```javascript
const UserActivityService = require('../services/user-activity.service');

// In your controller
await UserActivityService.logActivity(
  userId,
  'TICKET_VIEW',
  ticketId,
  'TICKET',
  { reason: 'user opened ticket view' }
);
```

### 4. Example: Log Ticket Creation

In `tickets.controller.js`:

```javascript
// After creating ticket
await UserActivityService.logActivity(
  req.user.user_id,
  'TICKET_CREATE',
  newTicket.ticket_id,
  'TICKET',
  { category: newTicket.category, priority: newTicket.priority }
);
```

### 5. Example: Log Comments

In `ticket-comments.controller.js`:

```javascript
// After adding comment
await UserActivityService.logActivity(
  req.user.user_id,
  'COMMENT',
  ticketId,
  'TICKET',
  { comment_subject: comment.subject }
);
```

---

## Performance Considerations

### Query Performance
- **Login/Logout queries** use indexed columns
- **Active users query** filters by timestamp (indexed)
- **Activity logs pagination** prevents loading too many records

### Data Retention
- Logs are kept indefinitely by default
- Use the purge endpoint to delete logs older than N days:

```bash
curl -X POST \
  'http://localhost:3001/api/admin/purge-logs' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{ "daysOld": 90 }'
```

### Storage Estimates
- Average activity log size: ~300 bytes
- For 100 users creating 50 activities/day:
  - Daily: ~1.5 MB
  - Monthly: ~45 MB
  - Yearly: ~540 MB

---

## Monitoring Dashboard Integration

### For React Frontend

Add to your admin navigation:

```jsx
import AdminActivityMonitor from './pages/AdminActivityMonitor';

// In your router
<Route path="/admin/activity-monitor" element={<AdminActivityMonitor user={user} />} />
```

### Features Included
- ✅ Real-time active user list
- ✅ Detailed activity logs with filtering
- ✅ Activity statistics by period
- ✅ Auto-refresh with configurable intervals
- ✅ Mobile-responsive design
- ✅ Role-based access control

---

## Security & Privacy

### Access Control
- Only `system_admin` and `it_manager` roles can view:
  - Active users list
  - Activity logs
  - User sessions
  - Activity statistics
- Only `system_admin` can purge logs

### Data Protection
- Activity logs are not visible to end users
- IP addresses and user agents logged for security audit
- JSONB details allow structured log data

### Compliance
- Audit trail maintained for compliance purposes
- Timestamps in UTC
- Activity records maintained even after user deactivation

---

## Troubleshooting

### Issue: Activity logs not showing

**Check:**
1. Database migration applied: Check `user_activity_logs` table exists
2. Auth controller updated: Check `UserActivityService.logLogin()` called
3. API route registered: Check `app.js` includes activity routes

**Fix:**
```bash
# Apply migration
psql "YOUR_DATABASE_URL" < database/migrations/2026-02-24_user_activity_logs.sql

# Restart backend
npm start
```

### Issue: Too many activity logs

**Solution:** Purge old logs
```bash
curl -X POST 'http://localhost:3001/api/admin/purge-logs' \
  -H 'Authorization: Bearer TOKEN' \
  -d '{ "daysOld": 90 }'
```

### Issue: Activity logs slow down system

**Solution:** Add more indexes or archive old logs
```sql
-- Archive to separate table
CREATE TABLE user_activity_logs_archive AS
SELECT * FROM user_activity_logs
WHERE activity_timestamp < NOW() - INTERVAL '6 MONTHS';

-- Delete archived logs
DELETE FROM user_activity_logs
WHERE activity_timestamp < NOW() - INTERVAL '6 MONTHS';
```

---

## Example Queries

### Active Users Right Now
```sql
SELECT * FROM active_users_view;
```

### User Login History (Last 7 Days)
```sql
SELECT * FROM user_activity_logs
WHERE user_id = 'user-uuid'
  AND activity_type IN ('LOGIN', 'LOGOUT')
  AND activity_timestamp > NOW() - INTERVAL '7 DAYS'
ORDER BY activity_timestamp DESC;
```

### Most Active Users Today
```sql
SELECT user_id, COUNT(*) as activity_count
FROM user_activity_logs
WHERE DATE(activity_timestamp) = TODAY()
GROUP BY user_id
ORDER BY activity_count DESC
LIMIT 10;
```

### Login Success Rate
```sql
SELECT 
  DATE(activity_timestamp) as date,
  COUNT(CASE WHEN activity_type = 'LOGIN' THEN 1 END) as logins,
  COUNT(CASE WHEN activity_type = 'LOGOUT' THEN 1 END) as logouts,
  ROUND(100.0 * COUNT(CASE WHEN activity_type = 'LOGOUT' THEN 1 END) / 
    COUNT(CASE WHEN activity_type = 'LOGIN' THEN 1 END), 2) as logout_rate
FROM user_activity_logs
WHERE activity_timestamp > NOW() - INTERVAL '30 DAYS'
GROUP BY DATE(activity_timestamp)
ORDER BY date DESC;
```

---

## Future Enhancements

Potential improvements:
- [ ] Real-time Socket.io alerts for admin login/logout
- [ ] Email notifications for failed login attempts
- [ ] IP-based anomaly detection
- [ ] Geographic location tracking
- [ ] Time-zone aware activity display
- [ ] Export activity logs to CSV
- [ ] Activity heatmap visualization
- [ ] User behavior analytics
- [ ] Compliance report generation

---

## Support

For issues or questions about user activity logging:
1. Check the troubleshooting section above
2. Review API endpoint documentation
3. Check logs: `backend/src/logs/`
4. Email: it-support@madison88.com
