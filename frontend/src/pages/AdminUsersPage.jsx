import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../api/client";

const roleOptions = ["end_user", "it_agent", "it_manager", "system_admin"];
const locationOptions = ["Philippines", "US", "Indonesia", "China", "Other"];

const getRoleColor = (role) => {
  switch (role) {
    case 'system_admin': return '#ff5d6c';
    case 'it_manager': return '#ffb547';
    case 'it_agent': return '#37d996';
    default: return '#2fd7ff';
  }
};

const UserAvatar = ({ name, color }) => {
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
  return (
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      background: `linear-gradient(135deg, ${color}20, ${color}40)`,
      border: `1px solid ${color}30`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color,
      fontWeight: '700',
      fontSize: '14px',
      flexShrink: 0,
      fontFamily: 'Sora',
      boxShadow: `0 4px 12px ${color}15`
    }}>
      {initials}
    </div>
  );
};

const StatCard = ({ title, value, sub, color }) => (
  <div className="glass hover-lift" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: `4px solid ${color}` }}>
    <h3 style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', margin: 0 }}>{title}</h3>
    <strong style={{ color: '#f8fafc', fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>{value}</strong>
    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{sub}</span>
  </div>
);

const AdminUsersPage = () => {
  const STRINGS = (typeof window !== 'undefined' && window.__APP_STRINGS__ && window.__APP_STRINGS__.adminUsers) || {
    prevButton: '← Previous',
    nextButton: 'Next',
    pageLabel: 'Page'
  };

  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingActive, setLoadingActive] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [archivedFilter, setArchivedFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 5;
  const [tempPasswordInfo, setTempPasswordInfo] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null });
  const [undoInfo, setUndoInfo] = useState(null); // { userId, timerId }
  const [resetToast, setResetToast] = useState(null);

  // Debug helper: open the page with ?debug_active=1 to simulate currently active users
  const debugActive = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug_active') === '1';

  const abortControllerRef = React.useRef(null);

  // Load active users (logged in within last 15 minutes)
  const loadActiveUsers = useCallback(async () => {
    try {
      setLoadingActive(true);
      const res = await apiClient.get('/admin/active-users?withinMinutes=15');
      setActiveUsers(res.data.data.activeUsers || []);
      
      // Log location context for debugging
      if (res.data.data.location && res.data.data.location !== 'All Locations') {
        console.log(`[User Activity] Viewing users from: ${res.data.data.location}`);
      }
    } catch (err) {
      console.error('Failed to load active users:', err);
      // Don't show error toast for active users - it's secondary info
    } finally {
      setLoadingActive(false);
    }
  }, []);

  // If debug flag is set, simulate active users after the users list is loaded
  useEffect(() => {
    if (!debugActive) return;
    if (users.length === 0) return;

    // Mark first two users as active for visual verification
    const mock = users.slice(0, 2).map(u => ({
      user_id: u.user_id,
      activity_timestamp: new Date().toISOString(),
      minutes_since_activity: 0,
    }));
    setActiveUsers(mock);
    setLoadingActive(false);
  }, [debugActive, users]);

  const load = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (roleFilter) params.append("role", roleFilter);
      if (locationFilter) params.append("location", locationFilter);
      if (archivedFilter) params.append("archived", archivedFilter);

      const res = await apiClient.get(`/users?${params.toString()}`, { signal });
      setUsers(res.data.data.users || []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return; // Ignore cancellation
      }
      console.error("Failed to load users:", err);
      // Only verify loading state if not canceled (though usually we'd want to ensure loading is off if error)
    } finally {
      // Only turn off loading if this request wasn't aborted
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [search, roleFilter, locationFilter, archivedFilter]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // Reset pagination when filters/search change or when users list updates
  useEffect(() => {
    setPageIndex(0);
  }, [search, roleFilter, locationFilter, archivedFilter, users.length]);

  // Load active users on mount and refresh every 30 seconds
  useEffect(() => {
    loadActiveUsers();
    const interval = setInterval(loadActiveUsers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadActiveUsers]);

  const updateUser = async (id, updates) => {
    try {
      const res = await apiClient.patch(`/users/${id}`, updates);
      if (res.data.data?.temporary_password) {
        setTempPasswordInfo({
          user: res.data.data.user,
          password: res.data.data.temporary_password,
          message: res.data.data.message,
        });
        setTimeout(() => setTempPasswordInfo(null), 30000);
      }
      load();
      return res.data;
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user");
      throw err;
    }
  };

  const handleResetPassword = async (user) => {
    try {
      const res = await apiClient.post(`/users/${user.user_id}/reset-password`);
      if (res.data.data?.temporary_password) {
        setTempPasswordInfo({
          user: res.data.data.user,
          password: res.data.data.temporary_password,
          message: res.data.data.message,
        });
        setTimeout(() => setTempPasswordInfo(null), 30000);
      }
      // Show a short success toast telling admin that a reset link was sent
      setResetToast({ message: `Reset link sent to ${user.email}` });
      setTimeout(() => setResetToast(null), 5000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset password");
    }
  };

  // Open confirmation modal for deactivate/activate
  const handleConfirmToggle = (user) => {
    setConfirmModal({ open: true, user });
  };

  const clearUndo = () => {
    if (undoInfo?.timerId) clearTimeout(undoInfo.timerId);
    setUndoInfo(null);
  };

  const performToggle = async () => {
    const user = confirmModal.user;
    if (!user) return setConfirmModal({ open: false, user: null });
    const targetState = !user.is_active;
    try {
      await updateUser(user.user_id, { is_active: targetState });
      // After successful toggle, show undo toast (only when deactivating)
      if (targetState === false) {
        const timerId = setTimeout(() => setUndoInfo(null), 8000);
        setUndoInfo({ userId: user.user_id, timerId });
      }
      load();
    } catch (err) {
      // error already alerted in updateUser
    } finally {
      setConfirmModal({ open: false, user: null });
    }
  };

  const handleUndo = async () => {
    if (!undoInfo?.userId) return;
    try {
      await updateUser(undoInfo.userId, { is_active: true });
      clearUndo();
      load();
    } catch (err) {
      // ignore, updateUser shows alert
    }
  };

  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "" });

  const handleEditStart = (user) => {
    setEditingUserId(user.user_id);
    setEditForm({ full_name: user.full_name, email: user.email });
  };

  const handleEditCancel = () => {
    setEditingUserId(null);
    setEditForm({ full_name: "", email: "" });
  };

  const handleEditSave = async (id) => {
    await updateUser(id, editForm);
    setEditingUserId(null);
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'system_admin').length,
    managers: users.filter(u => u.role === 'it_manager').length,
    agents: users.filter(u => u.role === 'it_agent').length,
    activeNow: activeUsers.length,
  };

  return (
    <div className="admin-page animate-fadeIn">
      <header className="topbar">
        <div>
          <h2>User Management</h2>
          <p>Global Directory & Access Control</p>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard title="Total Directory" value={stats.total} sub="Active Staff" color="#2fd7ff" />
        <StatCard title="Currently Active" value={stats.activeNow} sub="Using System Now" color="#37d996" />
        <StatCard title="Regional Management" value={stats.managers} sub="IT Managers" color="#ffb547" />
        <StatCard title="Technical Support" value={stats.agents} sub="IT Agents" color="#37d996" />
        <StatCard title="System Control" value={stats.admins} sub="Super Admins" color="#ff5d6c" />
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>{confirmModal.user && confirmModal.user.is_active ? 'Deactivate user?' : 'Activate user?'}</h3>
            <p>{confirmModal.user ? `${confirmModal.user.full_name} (${confirmModal.user.email})` : ''}</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="text-action" onClick={() => setConfirmModal({ open: false, user: null })}>Cancel</button>
              <button className="text-action danger" onClick={performToggle}>{confirmModal.user && confirmModal.user.is_active ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {undoInfo && (
        <div className="toast undo-toast">
          <span>User deactivated</span>
          <button className="text-action" onClick={handleUndo}>UNDO</button>
        </div>
      )}

      {/* Reset success toast */}
      {resetToast && (
        <div className="toast success-toast">
          <span>{resetToast.message}</span>
        </div>
      )}

      <div className="glass controls-bar">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters-wrapper">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {roleOptions.map(r => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
          </select>
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="">All Locations</option>
            {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={archivedFilter} onChange={(e) => setArchivedFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="false">Only Active</option>
            <option value="true">Only Archived</option>
          </select>
          {(search || roleFilter || locationFilter || archivedFilter) && (
            <button className="text-btn" onClick={() => { setSearch(""); setRoleFilter(""); setLocationFilter(""); setArchivedFilter(""); }}>
              CLEAR FILTERS
            </button>
          )}
        </div>
      </div>

      {tempPasswordInfo && (
        <div className="glass notification-banner">
          <div className="notification-content">
            <span className="notification-label">SECURITY ALERT</span>
            <span className="notification-message">Temporary access code generated for <strong>{tempPasswordInfo.user.full_name}</strong></span>
          </div>
          <div className="credential-box">
            <code>{tempPasswordInfo.password}</code>
            <button className="action-btn" onClick={() => navigator.clipboard.writeText(tempPasswordInfo.password)}>COPY</button>
            <button className="text-btn" onClick={() => setTempPasswordInfo(null)}>DISMISS</button>
          </div>
        </div>
      )}

      <div className="glass table-container">
        {loading ? (
          <div className="loading-state">Syncing Directory...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">No personnel records found.</div>
        ) : (
          (() => {
            // Client-side filtering for archived/active statuses in case backend doesn't support the param
            const filteredUsers = users.filter((user) => {
              if (archivedFilter === "false") {
                // Only Active: not archived and is_active true
                return !user.archived_at && user.is_active;
              }
              if (archivedFilter === "true") {
                // Only Archived: archived_at exists
                return !!user.archived_at;
              }
              return true; // All statuses
            });

            const total = filteredUsers.length;
            const start = pageIndex * PAGE_SIZE;
            const end = Math.min(start + PAGE_SIZE, total);
            const pageUsers = filteredUsers.slice(start, end);

            return (
              <div>
                <div className="users-list">
            <div className="list-header">
              <span>USER IDENTITY</span>
              <span>ROLE & STATUS</span>
              <span>LOCATION ASSIGNMENT</span>
              <span>ACTIVITY</span>
              <span style={{ textAlign: 'right' }}>ACTIONS</span>
            </div>
            {pageUsers.map((user) => {
              const isActive = activeUsers.find(u => u.user_id === user.user_id);
              const lastActivityTime = isActive?.activity_timestamp ? new Date(isActive.activity_timestamp) : null;
              const minutesSinceActivity = isActive?.minutes_since_activity;
              
              return (
              <div key={user.user_id} className={`user-row ${!user.is_active ? 'inactive' : ''}`}>
                <div className="user-info">
                  <UserAvatar name={user.full_name} color={getRoleColor(user.role)} />
                  {editingUserId === user.user_id ? (
                    <div className="edit-inputs">
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="inline-input"
                        placeholder="Full Name"
                      />
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="inline-input"
                        placeholder="Email Address"
                      />
                    </div>
                  ) : (
                    <div>
                      <strong>{user.full_name}</strong>
                      <small>{user.email}</small>
                    </div>
                  )}
                </div>

                <div className="user-role">
                  <span className="role-badge" style={{ color: getRoleColor(user.role), borderColor: `${getRoleColor(user.role)}40`, background: `${getRoleColor(user.role)}10` }}>
                    {user.role.replace('_', ' ')}
                  </span>
                      {!user.is_active && <span className="status-badge">INACTIVE</span>}
                      {user.archived_at && (
                        <>
                          <span className="status-badge">ARCHIVED</span>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                            {new Date(user.archived_at).toLocaleString()} {user.archived_by_name ? `· by ${user.archived_by_name}` : ''}
                          </div>
                        </>
                      )}
                </div>

                <div className="user-location">
                  <select
                    value={user.location || ""}
                    onChange={(e) => updateUser(user.user_id, { location: e.target.value })}
                    className="location-select"
                  >
                    <option value="">UNASSIGNED</option>
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc}>{loc.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="user-activity" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: '0.25rem' }}>
                  {isActive ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#37d996', boxShadow: '0 0 6px #37d996' }}></span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#37d996' }}>ACTIVE NOW</span>
                      </div>
                      <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        {minutesSinceActivity === 0 ? 'Just now' : `${minutesSinceActivity}m ago`}
                      </small>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8', opacity: '0.5' }}></span>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>OFFLINE</span>
                      </div>
                      <small style={{ color: '#64748b', fontSize: '0.75rem' }}>No recent activity</small>
                    </>
                  )}
                </div>

                <div className="user-actions">
                  {editingUserId === user.user_id ? (
                    <>
                      <button className="text-action success" onClick={() => handleEditSave(user.user_id)}>SAVE</button>
                      <button className="text-action" onClick={handleEditCancel}>CANCEL</button>
                    </>
                  ) : (
                    <>
                      <button className="text-action primary" onClick={() => handleEditStart(user)}>EDIT</button>
                      <select
                        value={user.role}
                        onChange={(e) => updateUser(user.user_id, { role: e.target.value })}
                        className="role-select"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>

                      {['it_agent', 'it_manager', 'system_admin'].includes(user.role) && (
                        <button className="text-action warning" onClick={() => handleResetPassword(user)}>RESET PW</button>
                      )}

                      {user.archived_at ? (
                        <button className="text-action success" onClick={() => updateUser(user.user_id, { is_active: true })}>RESTORE</button>
                      ) : (
                        <button
                          className={`text-action ${user.is_active ? 'danger' : 'success'}`}
                          onClick={() => handleConfirmToggle(user)}
                          aria-label={user.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
            })}
                </div>

                {/* Pagination controls (styled to match system) */}
                <div className="pagination-row">
                  <button
                    className="pagination-btn prev"
                    onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                    disabled={pageIndex === 0}
                    aria-label="Previous page"
                  >
                    {STRINGS.prevButton} {PAGE_SIZE}
                  </button>

                  <div className="pagination-info">
                    {STRINGS.pageLabel} {Math.max(1, Math.min(Math.ceil(total / PAGE_SIZE) || 1, pageIndex + 1))} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                  </div>

                  <button
                    className="pagination-btn primary next"
                    onClick={() => setPageIndex(pageIndex + 1)}
                    disabled={end >= total}
                    aria-label="Next page"
                  >
                    {STRINGS.nextButton} {PAGE_SIZE} →
                  </button>
                </div>
              </div>
            );
          })()
          )}
        )}
      </div>

      <style>{`
        .admin-page { max-width: 1400px; margin: 0 auto; color: #fff; }

        /* Use shared topbar styles from the system for consistent headings */
        .topbar { padding: 0; margin-bottom: 0; }
        .topbar h2 { margin: 0 0 4px 0; }
        .topbar p { margin: 0; }

        /* Prefer global design tokens for glass surfaces */
        .glass {
          background: var(--glass);
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
        }

        .hover-lift { transition: transform 0.2s ease; }
        .hover-lift:hover { transform: translateY(-4px); }

        .stats-grid { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 1.5rem; 
          margin-bottom: 2rem;
        }

        .controls-bar {
          padding: 1.2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .search-wrapper input {
          background: rgba(5, 11, 31, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.8rem 1.2rem;
          border-radius: 12px;
          color: #fff;
          width: 300px;
          font-family: 'Sora', sans-serif;
        }
        .search-wrapper input:focus { outline: none; border-color: #3b82f6; }

        .filters-wrapper { display: flex; gap: 1rem; align-items: center; }
        .filters-wrapper select {
          background: rgba(5, 11, 31, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.8rem 1rem;
          border-radius: 12px;
          color: #cbd5e1;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
        }
        .filters-wrapper select option { background: #0f172a; }

        .text-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          letter-spacing: 0.05em;
        }
        .text-btn:hover { color: #fff; text-decoration: underline; }

        .notification-banner {
          padding: 1.5rem;
          border: 1px solid rgba(55, 217, 150, 0.3);
          background: rgba(55, 217, 150, 0.05);
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .notification-label {
          background: #10b981;
          color: #064e3b;
          font-weight: 800;
          font-size: 0.7rem;
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          margin-right: 1rem;
        }
        .credential-box { display: flex; align-items: center; gap: 1rem; }
        .credential-box code { 
          font-family: monospace; 
          font-size: 1.5rem; 
          font-weight: 700; 
          color: #34d399; 
          letter-spacing: 2px;
        }
        .action-btn {
          background: #10b981;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .table-container { padding: 0.5rem; min-height: 400px; }
        .list-header {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.5fr;
          padding: 1rem 1.5rem;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          gap: 1rem;
        }
        
        .user-row {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.5fr;
          padding: 1.2rem 1.5rem;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          transition: background 0.2s;
          gap: 1rem;
        }
        .user-row:hover { background: rgba(255, 255, 255, 0.02); }
        .user-row.inactive { opacity: 0.6; }

        .user-info { display: flex; gap: 1rem; align-items: center; flex: 1; min-width: 0; }
        .user-info strong { font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-info small { display: block; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .user-role { display: flex; flex-direction: column; gap: 0.25rem; }
        
        .user-location { display: flex; width: 100%; }
        
        .user-activity { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 0.25rem; }

        .edit-inputs { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 0; }
        .inline-input {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.4rem 0.8rem;
          color: #fff;
          font-size: 0.85rem;
          width: 100%;
        }
        .inline-input:focus { outline: none; border-color: #3b82f6; }

        .role-badge {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 0.3rem 0.8rem;
          border-radius: 6px;
          border: 1px solid;
          letter-spacing: 0.05em;
          display: inline-block;
          white-space: nowrap;
        }
        .status-badge {
          font-size: 0.7rem;
          color: #94a3b8;
          font-weight: 700;
          margin-top: 0.25rem;
          display: inline-block;
          white-space: nowrap;
        }

        .location-select, .role-select {
          background: transparent;
          border: none;
          color: #cbd5e1;
          font-family: 'Sora', sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          width: 100%;
          max-width: 100%;
        }
        .location-select option, .role-select option { background: #0f172a; }

        .user-actions { display: flex; justify-content: flex-end; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
        .text-action {
          background: none;
          border: none;
          font-weight: 700;
          font-size: 0.7rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
          letter-spacing: 0.05em;
          white-space: nowrap;
          padding: 0.25rem 0;
        }
        .text-action:hover { opacity: 1; text-decoration: underline; }
        .text-action.primary { color: #3b82f6; opacity: 1; }
        .text-action.warning { color: #fbbf24; }
        .text-action.danger { color: #ef4444; }
        .text-action.success { color: #10b981; }

        .loading-state, .empty-state { text-align: center; padding: 4rem; color: #64748b; font-weight: 600; }
        
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        /* Modal styles */
        .modal-overlay { position: fixed; inset: 0; background: rgba(2,6,23,0.6); display:flex; align-items:center; justify-content:center; z-index:1200; }
        .modal { background: #0b1220; border: 1px solid rgba(255,255,255,0.06); padding: 1.25rem; border-radius: 12px; width: 420px; color: #fff; box-shadow: 0 10px 40px rgba(2,6,23,0.7); }
        .modal h3 { margin: 0 0 0.25rem 0; font-size: 1.1rem; }
        .modal p { margin: 0; color: #94a3b8; }

        /* Toasts */
        .toast { position: fixed; right: 1rem; bottom: 1rem; background: rgba(15,23,42,0.9); color: #fff; padding: 0.75rem 1rem; border-radius: 8px; display:flex; gap:0.75rem; align-items:center; z-index:1300; box-shadow: 0 6px 24px rgba(2,6,23,0.6); }
        .toast button { background: none; border: none; color: #7dd3fc; font-weight:700; cursor:pointer; }
        .undo-toast { background: rgba(17, 24, 39, 0.95); }
        .success-toast { background: rgba(34,197,94,0.95); color: #022c22; }

        /* Pagination styles matching system design */
        .pagination-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          margin-top: 1rem;
        }
        .pagination-info {
          color: var(--slate-100);
          font-weight: 700;
          font-size: 0.95rem;
        }
        .pagination-btn {
          background: rgba(7, 12, 28, 0.6);
          border: 1px solid rgba(255,255,255,0.04);
          color: var(--slate-100);
          padding: 0.55rem 0.9rem;
          border-radius: 10px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(2,6,23,0.6);
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .pagination-btn:not(:disabled):hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 14px 36px rgba(2,6,23,0.6); }
        .pagination-btn:not(:disabled):active { transform: translateY(0) scale(0.98); }
        .pagination-btn:disabled { opacity: 0.45; cursor: default; }
        .pagination-btn.primary {
          background: linear-gradient(180deg, #4f8bff, #2b6bff);
          border: none;
          color: white;
          box-shadow: 0 8px 28px rgba(43,107,255,0.28), 0 2px 6px rgba(43,107,255,0.12) inset;
          padding: 0.6rem 1.05rem;
        }
        .pagination-btn.primary:not(:disabled):hover { transform: translateY(-6px) scale(1.035); box-shadow: 0 18px 46px rgba(43,107,255,0.34); }
        .pagination-btn.primary:not(:disabled):active { transform: translateY(0) scale(0.985); }
        .pagination-btn.primary:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
};

export default AdminUsersPage;
