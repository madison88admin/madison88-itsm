import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';
import './AdminActivityMonitor.css';

export default function AdminActivityMonitor({ user }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [selectedTab, setSelectedTab] = useState('active'); // active, logs, stats
  const [filters, setFilters] = useState({
    activityType: '',
    userId: '',
    role: '',
    period: '24_hours'
  });

  // Load active users
  const loadActiveUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/active-users?withinMinutes=15');
      setActiveUsers(res.data.data.activeUsers || []);
    } catch (err) {
      console.error('Failed to load active users:', err);
      toast.error('Failed to load active users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load activity logs
  const loadActivityLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.activityType) params.append('activityType', filters.activityType);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.role) params.append('role', filters.role);
      params.append('limit', 100);

      const res = await apiClient.get(`/admin/activity-logs?${params.toString()}`);
      setActivityLogs(res.data.data.logs || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load activity stats
  const loadActivityStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/admin/activity-stats?period=${filters.period}`);
      setStats(res.data.data.stats || []);
    } catch (err) {
      console.error('Failed to load activity stats:', err);
      toast.error('Failed to load activity stats');
    } finally {
      setLoading(false);
    }
  }, [filters.period]);

  // Set up auto-refresh
  useEffect(() => {
    if (selectedTab === 'active') {
      loadActiveUsers();
      const interval = setInterval(loadActiveUsers, refreshInterval * 1000);
      return () => clearInterval(interval);
    } else if (selectedTab === 'logs') {
      loadActivityLogs();
    } else if (selectedTab === 'stats') {
      loadActivityStats();
    }
  }, [selectedTab, refreshInterval, loadActiveUsers, loadActivityLogs, loadActivityStats]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getActivityIcon = (type) => {
    const icons = {
      LOGIN: '🔓',
      LOGOUT: '🔒',
      TICKET_VIEW: '📋',
      TICKET_CREATE: '✏️',
      COMMENT: '💬',
      SEARCH: '🔍',
      ATTACHMENT: '📎',
      ESCALATION: '⬆️',
      STATUS_CHANGE: '🔄'
    };
    return icons[type] || '📌';
  };

  return (
    <div className="admin-activity-monitor">
      <header className="monitor-header">
        <div>
          <h1>📊 User Activity Monitor</h1>
          <p>Real-time monitoring of active users and system activity</p>
        </div>
        <div className="header-controls">
          <label>
            Auto-refresh:
            <select 
              value={refreshInterval} 
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={10}>10 sec</option>
              <option value={30}>30 sec</option>
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
            </select>
          </label>
          <button onClick={() => {
            if (selectedTab === 'active') loadActiveUsers();
            else if (selectedTab === 'logs') loadActivityLogs();
            else loadActivityStats();
          }} disabled={loading}>
            {loading ? '⏳ Refreshing...' : '🔄 Refresh Now'}
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${selectedTab === 'active' ? 'active' : ''}`}
          onClick={() => setSelectedTab('active')}
        >
          👥 Active Users ({activeUsers.length})
        </button>
        <button 
          className={`tab-button ${selectedTab === 'logs' ? 'active' : ''}`}
          onClick={() => setSelectedTab('logs')}
        >
          📝 Activity Logs
        </button>
        <button 
          className={`tab-button ${selectedTab === 'stats' ? 'active' : ''}`}
          onClick={() => setSelectedTab('stats')}
        >
          📊 Statistics
        </button>
      </div>

      {/* Active Users Tab */}
      {selectedTab === 'active' && (
        <div className="tab-content">
          <div className="users-grid">
            {activeUsers.length === 0 ? (
              <div className="empty-state">
                <p>No active users in the last 15 minutes</p>
              </div>
            ) : (
              activeUsers.map((user) => (
                <div key={user.user_id} className="user-card">
                  <div className="user-header">
                    <h3>{user.full_name}</h3>
                    <span className={`role-badge ${user.role}`}>{user.role}</span>
                  </div>
                  <div className="user-info">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Location:</strong> {user.location || 'N/A'}</p>
                    <p><strong>Last Activity:</strong> {formatTime(user.activity_timestamp)}</p>
                    <p><strong>Status:</strong> 
                      <span className="status-badge">
                        {user.minutes_since_activity <= 5 ? '🟢 Active' : '🟡 Idle'}
                      </span>
                    </p>
                    <p><strong>Current Activity:</strong> {user.activity_type || 'N/A'}</p>
                    {user.ip_address && <p><strong>IP:</strong> {user.ip_address}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Activity Logs Tab */}
      {selectedTab === 'logs' && (
        <div className="tab-content">
          <div className="filters">
            <input 
              type="text"
              placeholder="Filter by user ID"
              value={filters.userId}
              onChange={(e) => setFilters({...filters, userId: e.target.value})}
            />
            <select
              value={filters.activityType}
              onChange={(e) => setFilters({...filters, activityType: e.target.value})}
            >
              <option value="">All Activity Types</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="TICKET_VIEW">Ticket View</option>
              <option value="TICKET_CREATE">Ticket Create</option>
              <option value="COMMENT">Comment</option>
              <option value="SEARCH">Search</option>
            </select>
            <select
              value={filters.role}
              onChange={(e) => setFilters({...filters, role: e.target.value})}
            >
              <option value="">All Roles</option>
              <option value="end_user">End User</option>
              <option value="it_agent">IT Agent</option>
              <option value="it_manager">IT Manager</option>
              <option value="system_admin">System Admin</option>
            </select>
            <button onClick={loadActivityLogs} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>

          <div className="activity-table">
            {activityLogs.length === 0 ? (
              <p className="empty-state">No activity logs found</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Activity</th>
                    <th>Resource</th>
                    <th>IP Address</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((log) => (
                    <tr key={log.activity_id}>
                      <td className="timestamp">{formatTime(log.activity_timestamp)}</td>
                      <td className="user-name">
                        <span className="icon">{getActivityIcon(log.activity_type)}</span>
                        {log.full_name}
                      </td>
                      <td><span className={`role-badge ${log.role}`}>{log.role}</span></td>
                      <td className="activity-type">{log.activity_type}</td>
                      <td className="resource">{log.resource_type || '-'}</td>
                      <td className="ip">{log.ip_address || '-'}</td>
                      <td className="location">{log.location || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {selectedTab === 'stats' && (
        <div className="tab-content">
          <div className="stats-filters">
            <label>
              Period:
              <select
                value={filters.period}
                onChange={(e) => setFilters({...filters, period: e.target.value})}
              >
                <option value="24_hours">Last 24 Hours</option>
                <option value="7_days">Last 7 Days</option>
                <option value="30_days">Last 30 Days</option>
              </select>
            </label>
            <button onClick={loadActivityStats} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh Stats'}
            </button>
          </div>

          <div className="stats-grid">
            {stats.length === 0 ? (
              <p className="empty-state">No activity data for selected period</p>
            ) : (
              stats.map((stat, idx) => (
                <div key={idx} className="stat-card">
                  <h4>{stat.activity_type}</h4>
                  <div className="stat-value">{stat.count}</div>
                  <p className="stat-label">Total Activities</p>
                  <p>👥 {stat.unique_users} unique users</p>
                  <p>📅 {stat.days_active} days active</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
