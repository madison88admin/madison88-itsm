# User Management - Active User Tracking

## 📊 Overview

The User Management page now displays **real-time active user information** directly in the user directory. Admins can see at a glance who is currently using the system.

---

## Features Added

### 1. **"Currently Active" Stat Card**
- **Blue statistic box** showing number of users logged in right now
- Updates every 30 seconds automatically
- Shows "Using System Now" subtitle

**Location**: Top of the User Management page, next to Total Directory stats

### 2. **Activity Status Column**
- **New column** in the users table showing real-time status
- Two states:
  - 🟢 **ACTIVE NOW** (green dot, pulsing) - User logged in within last 15 minutes
  - ⚫ **OFFLINE** (gray dot) - User not actively using system

**Location**: Between "Location Assignment" and "Actions" columns

### 3. **Last Activity Timestamp**
- Shows how long ago the user was last active
- Examples:
  - "Just now" - Within last minute
  - "2m ago" - 2 minutes ago
  - "15m ago" - 15 minutes ago
  - "No recent activity" - User offline

---

## How to Use

### View Who's Online Now

1. Go to **User Management**
2. Look at the second stat card: "Currently Active"
3. This number = users currently using the system

**Example**:
```
Currently Active: 5
Using System Now
```
This means 5 users are logged in and active right now.

### Check Specific User Status

1. Go to **User Management** 
2. Scroll through the user list
3. Look at the **ACTIVITY** column:
   - 🟢 ACTIVE NOW - User is using system
   - ⚫ OFFLINE - User is not active

**Example row**:
```
John Smith | IT Agent | Philippines | 🟢 ACTIVE NOW (2m ago) | [EDIT] [ROLE▼] [DEACTIVATE]
```

### Monitor User Activity in Real-Time

- **Auto-refresh**: Page updates every 30 seconds
- **Manual refresh**: Press F5 or click refresh button
- See who logs in/out in real-time

---

## Data Source

All active user information comes from the **User Activity Logs** system:

- **Source**: `/api/admin/active-users` endpoint
- **Data**: Users with activity in last 15 minutes
- **Refresh**: Every 30 seconds
- **Includes**: IP address, location, last activity timestamp

---

## What Counts as "Active"

A user is considered **actively using** the system if:

✅ They have logged in  
✅ They have an activity record in the last 15 minutes  
✅ Activities include: login, logout, ticket views, comments, searches, etc.

**Examples:**
- Login at 10:00 AM → Active until 10:15 AM
- Comment added at 10:05 AM → Active at 10:20 AM
- No activity from 10:15-10:30 → Shows as OFFLINE

---

## Admin Dashboard Benefits

### 1. Capacity Planning
**Question**: "How many people are using the system at peak hours?"
- Check User Management page at different times
- Track the "Currently Active" number
- Plan for infrastructure needs

### 2. Support Monitoring
**Question**: "Is anyone currently having issues?"
- See who's online
- Can proactively reach out if needed
- Contact active users immediately

### 3. Shift Management
**Question**: "How many agents are working right now?"
- Filter by role = "it_agent"
- See how many are currently active
- Redistribute workload if unbalanced

### 4. Compliance & Auditing
**Question**: "Who was using the system at [specific time]?"
- Go to Activity Monitor dashboard
- Check activity logs for timestamp
- See all active users at that time

---

## Performance Notes

### Activity Update Frequency
- **Active users list**: Updates every 30 seconds
- **Database query**: Optimized with indexes
- **No impact**: Doesn't slow down other features

### Data Retention
- Active users displayed: Last 15 minutes
- Detailed logs stored: Indefinitely
- Historical data: Available in Activity Monitor

---

## Troubleshooting

### Issue: All users showing as OFFLINE

**Likely cause**: 
- No activity in last 15 minutes
- Database hasn't synced yet
- Activity logging not enabled

**Solution**:
1. Check if migration was applied: `user_activity_logs` table exists
2. Verify auth controller logs logins
3. Wait 15 minutes and reload page
4. Check browser console for errors

### Issue: Active user count doesn't match reality

**Possible reasons**:
- Users have open sessions but inactive > 15 min
- App crash or session loss
- Clock skew between frontend/backend

**Solution**:
1. Refresh page (F5)
2. Ask user to logout/login
3. Check backend logs for errors

### Issue: Activity status not updating

**Causes**:
- Auto-refresh disabled
- Browser console error
- API endpoint down

**Fix**:
1. Press F5 to manually refresh
2. Check browser F12 console for errors
3. Try accessing `/api/admin/active-users` directly
4. Check backend service is running

---

## Integration with Other Features

### Activity Monitor Dashboard
- Detailed view of all activities
- Full filtering and search
- Historical data
- Location: `/admin/activity-monitor`

### User Activity Service
- Backend service logging all activities
- Can log custom activities
- Available for all features
- Service: `UserActivityService`

---

## Example Workflows

### Workflow 1: Monitor IT Agent Capacity
```
1. Go to User Management
2. Look at "Currently Active" stat
3. Filter by Role = "it_agent"
4. See how many IT agents are online
5. If < expected: Check if they're in meetings or breaks
6. If overloaded: Escalate tickets or reassign work
```

### Workflow 2: Track User Login Patterns
```
1. Check User Management stats at different times:
   - 8:00 AM: 10 users active (start of day)
   - 12:00 PM: 35 users active (peak lunch break)
   - 5:00 PM: 8 users active (end of day)
```

### Workflow 3: Investigate Suspicious Activity
```
1. See unexpected user in "Currently Active"
2. Click their row to see activity details
3. Go to Activity Monitor for full history
4. Check IP address and login location
5. Contact user if activity is suspicious
```

---

## Configuration

### Change Auto-Refresh Interval
Currently set to **30 seconds** in code:

Location: `frontend/src/pages/AdminUsersPage.jsx`
```javascript
// Load active users on mount and refresh every 30 seconds
const interval = setInterval(loadActiveUsers, 30000); // ← Adjust this value
```

**Options**:
- `10000` = 10 seconds (real-time, higher load)
- `30000` = 30 seconds (balanced)
- `60000` = 1 minute (battery-friendly)

### Change Active Window
Currently shows users active in last **15 minutes**:

Location: API call in component
```javascript
const res = await apiClient.get('/admin/active-users?withinMinutes=15');
```

**Options**:
- `5` = Last 5 minutes (very recent)
- `15` = Last 15 minutes (default, balanced)
- `30` = Last 30 minutes (broader)
- `60` = Last 1 hour (very broad)

---

## Advanced: Adding More Metrics

You can enhance the "Currently Active" stat card with additional metrics:

```javascript
// Example: Show breakdown by role
const stats = {
  activeNow: activeUsers.length,
  activeAgents: activeUsers.filter(u => u.role === 'it_agent').length,
  activeManagers: activeUsers.filter(u => u.role === 'it_manager').length,
  activeEndUsers: activeUsers.filter(u => u.role === 'end_user').length,
};
```

Then display:
```
Currently Active: 12
├─ Agents: 5
├─ Managers: 2
└─ End Users: 5
```

---

## Related Documentation

- 📊 [User Activity Logging Guide](USER_ACTIVITY_LOGGING.md) - Full activity logging details
- 📈 [Admin Activity Monitor Guide](ADMIN_ACTIVITY_MONITOR_QUICK_REFERENCE.md) - Detailed monitoring dashboard
- 🔐 [API Documentation](documentation/API_DOCUMENTATION.md) - Active users endpoint reference

---

## Support

- **Questions?** Email it-support@madison88.com
- **Issues?** Check Troubleshooting section above
- **Feature requests?** Create a ticket in the system

---

## Version Info
- **Added**: February 24, 2026
- **Status**: ✅ Live
- **Last Updated**: February 24, 2026
