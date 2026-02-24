# Admin Activity Monitor - Quick Reference

## 🎯 Quick Access

**URL**: `http://your-app/admin/activity-monitor`

**Requires**: System Admin or IT Manager role

---

## 📊 Dashboard Tabs

### 👥 Active Users Tab
**What you see**: All users logged in within the last 15 minutes

**Key Info**:
- User name & email
- Role (color-coded)
- Last activity timestamp
- Status: 🟢 Active (< 5 min idle) or 🟡 Idle (> 5 min)
- IP address
- Location

**Actions**:
- ⚙️ Change auto-refresh interval (10s, 30s, 1m, 5m)
- 🔄 Manual refresh button
- Click on user card for more details

---

### 📝 Activity Logs Tab
**What you see**: Complete audit trail of all user activities

**Columns**:
- Time (when activity happened)
- User (who did it)
- Role (user's role)
- Activity (what they did)
- Resource (ticket, KB article, etc.)
- IP Address (from where)
- Location (geographic)

**Filters**:
- **User ID** - Search by specific user
- **Activity Type** - LOGIN, LOGOUT, TICKET_CREATE, COMMENT, SEARCH, etc.
- **Role** - Filter by End User, Agent, Manager, Admin
- **Apply Filters** button - Execute the search

**Common Searches**:
- All logins today: Type "LOGIN"
- One user's activity: Enter their user ID
- All comments: Type "COMMENT"
- Manager activity only: Select role = "it_manager"

---

### 📊 Statistics Tab
**What you see**: Activity counts and trends

**Metrics**:
- Activity type (LOGIN, COMMENT, TICKET_CREATE, etc.)
- Total count for period
- Unique users involved
- Days active in period

**Period Options**:
- Last 24 Hours
- Last 7 Days
- Last 30 Days

**Use Cases**:
- "How many logins yesterday?" → 24 Hours tab
- "Most used features this month?" → 30 Days tab
- "Weekly activity trend?" → 7 Days tab

---

## ⚙️ Common Actions

### Find Who's Currently Online
1. Go to **Active Users** tab
2. Count users with 🟢 green status
3. Look at "minutes_since_activity" column

### Find a Specific User's Activity
1. Go to **Activity Logs** tab
2. Enter user ID in "Filter by user ID"
3. Click "Apply Filters"
4. Scroll to see all activities

### Track Login/Logout Pattern
1. Go to **Activity Logs** tab
2. Select Activity Type = "LOGIN" or "LOGOUT"
3. Click "Apply Filters"
4. See login times and IP addresses

### Check User Behavior Suspicious?
1. Go to **Activity Logs** tab
2. Search for user ID
3. Look at:
   - Login times (odd hours = suspicious)
   - IP addresses (same IP = normal, different IPs = review)
   - Activity frequency (unusual = review)

### Export Activity Report
(Coming soon - manual SQL query for now)

```sql
SELECT * FROM user_activity_logs
WHERE DATE(activity_timestamp) = TODAY()
ORDER BY activity_timestamp DESC;
```

---

## 🔍 What to Look For

### ✅ Normal Activity
- Regular login/logout during business hours
- Same IP address as usual
- Activity types match user role
- Reasonable time gaps between activities

### ⚠️ Suspicious Activity
- Multiple login attempts from different IPs
- Login outside business hours
- Agent with mostly user activities (not handling tickets)
- User logging in same time as LOGOUT event

### 🚨 Critical Activity
- Multiple failed login attempts
- Login + immediate escalation activities
- Mass data access in short time
- Unusual geographic locations

---

## ⏱️ Auto-Refresh Intervals

| Setting | Best For | Update Speed |
|---------|----------|--------------|
| 10 sec | Real-time monitoring | Very fast |
| 30 sec | Live dashboard | Fast |
| 1 min | Background monitoring | Normal |
| 5 min | Low activity environment | Bandwidth-friendly |

---

## 📱 Mobile Usage

Dashboard is responsive and works on:
- ✅ Desktop browsers
- ✅ Tablets (portrait & landscape)
- ⚠️ Mobile (tables may be cramped)

**Pro Tip**: Rotate phone to landscape for better table view

---

## 🔐 Security Tips

### Best Practices
- ✅ Review active users regularly
- ✅ Check IP addresses for consistency
- ✅ Monitor after-hours logins
- ✅ Watch for unusual activity spikes
- ✅ Archive old logs periodically

### Review Schedule
- **Daily**: Check active users
- **Weekly**: Review suspicious activity patterns
- **Monthly**: Generate statistics report
- **Quarterly**: Audit access patterns

---

## 🚀 Performance Notes

### Dashboard Speed
- **Active Users**: < 1 second
- **Activity Logs**: 1-2 seconds
- **Statistics**: 1-2 seconds

### If Dashboard is Slow
1. Reduce refresh interval
2. Apply filters to narrow results
3. Check browser console for errors
4. Refresh page (Ctrl+R)
5. Contact support if persists

---

## 📞 Common Issues & Fixes

### No Active Users Showing?
- Users must have logged in in last 15 minutes
- Check if users are actually logged in
- Check if database is updated

### All Users Showing as "Idle"?
- Idle status updates every 5 minutes
- "Idle" doesn't mean logged out
- Click "Refresh" to see latest status

### Can't See Activity Logs?
- Need system_admin or it_manager role
- Check your account permissions
- Try logout/login refresh

### Statistics Tab Empty?
- No activity in selected period
- Try "Last 30 Days"
- Check if database was recently cleared

---

## 🎨 Dashboard Features

### Color Coding
| Color | Meaning |
|-------|---------|
| 🟢 Green Status | Active (recently used) |
| 🟡 Yellow Status | Idle (no activity 5+ min) |
| Blue badges | End User |
| Green badges | IT Agent |
| Red badges | IT Manager |
| Orange badges | System Admin |

### Icons
| Icon | Meaning |
|------|---------|
| 🔓 | Login activity |
| 🔒 | Logout activity |
| 📋 | Ticket view |
| ✏️ | Create activity |
| 💬 | Comment activity |
| 🔍 | Search activity |

---

## 📊 Keyboard Shortcuts (Coming Soon)

- `R` - Refresh current tab
- `L` - Go to Active Users
- `A` - Go to Activity Logs
- `S` - Go to Statistics
- `?` - Show help

*(Not yet implemented - available in future version)*

---

## 📈 Dashboard Insights

### Questions You Can Answer

**"How many users are using the system today?"**
→ Active Users tab, count total

**"What is our most used feature?"**
→ Stats tab, 24 Hours, look at highest count

**"What time do most logins happen?"**
→ Activity Logs, filter = LOGIN, scan timestamps

**"Who was online when incident happened?"**
→ Activity Logs, set date range, see who was active

**"Is user X behaving abnormally?"**
→ Activity Logs, search user ID, review activity pattern

**"Do we need more IT agents?"**
→ Stats tab, 30 Days, count TICKET_CREATE + COMMENT activities

---

## 💾 Data Retention

**Activity logs kept**: Indefinitely (by default)

**Manual cleanup** (admin only):
```
POST /api/admin/purge-logs
Body: { "daysOld": 90 }  // Delete logs > 90 days old
```

**Recommended schedule**:
- Purge quarterly to keep database lean
- Keep 3-6 months for compliance

---

## 🆘 Get Help

- 📚 Full docs: `documentation/USER_ACTIVITY_LOGGING.md`
- 📖 Setup guide: `USER_ACTIVITY_LOGGING_SETUP.md`
- 📧 Email: it-support@madison88.com
- 🐛 Report bugs: Create a ticket in system

---

## 🎓 Training Videos (Coming Soon)

- [ ] How to use the Activity Monitor
- [ ] Security monitoring best practices
- [ ] Investigating suspicious activity
- [ ] Generating compliance reports

---

## Version Info
- **Created**: February 24, 2026
- **Status**: ✅ Production Ready
- **Last Updated**: February 24, 2026
