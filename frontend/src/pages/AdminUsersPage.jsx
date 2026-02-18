import React, { useEffect, useState } from "react";
import apiClient from "../api/client";

const roleOptions = ["end_user", "it_agent", "it_manager", "system_admin"];

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [tempPasswordInfo, setTempPasswordInfo] = useState(null);

  const load = async () => {
    const res = await apiClient.get("/users");
    setUsers(res.data.data.users || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateUser = async (id, updates) => {
    try {
      const res = await apiClient.patch(`/users/${id}`, updates);

      // Check if temporary password was generated
      if (res.data.data?.temporary_password) {
        setTempPasswordInfo({
          user: res.data.data.user,
          password: res.data.data.temporary_password,
          message: res.data.data.message,
        });
        // Auto-hide after 30 seconds
        setTimeout(() => setTempPasswordInfo(null), 30000);
      } else {
        setTempPasswordInfo(null);
      }

      load();
    } catch (err) {
      console.error("Failed to update user:", err);
      alert(err.response?.data?.message || "Failed to update user");
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>User Management</h2>
          <p>Manage roles and access.</p>
        </div>
      </div>

      {tempPasswordInfo && (
        <div className="panel success" style={{ marginBottom: "16px", padding: "16px", backgroundColor: "#1a3a5c", border: "2px solid #4ade80" }}>
          <div style={{ marginBottom: "12px" }}>
            <strong style={{ color: "#4ade80", fontSize: "16px" }}>
              ⚠️ Temporary Password Generated
            </strong>
          </div>
          <div style={{ marginBottom: "8px", color: "#e0e0e0" }}>
            <strong>User:</strong> {tempPasswordInfo.user.full_name} ({tempPasswordInfo.user.email})
          </div>
          <div style={{ marginBottom: "8px", color: "#e0e0e0" }}>
            <strong>New Role:</strong> {tempPasswordInfo.user.role}
          </div>
          <div style={{ marginBottom: "12px", padding: "12px", backgroundColor: "#0a1a2a", borderRadius: "4px", border: "1px solid #4ade80" }}>
            <div style={{ marginBottom: "4px", color: "#a0a0a0", fontSize: "12px" }}>Temporary Password:</div>
            <div style={{ fontSize: "20px", fontFamily: "monospace", color: "#4ade80", fontWeight: "bold", letterSpacing: "2px" }}>
              {tempPasswordInfo.password}
            </div>
          </div>
          <div style={{ marginBottom: "12px", color: "#ffd700", fontSize: "14px" }}>
            {tempPasswordInfo.message}
          </div>
          <button
            className="btn primary"
            onClick={() => {
              navigator.clipboard.writeText(tempPasswordInfo.password);
              alert("Password copied to clipboard!");
            }}
            style={{ marginRight: "8px" }}
          >
            Copy Password
          </button>
          <button
            className="btn ghost"
            onClick={() => setTempPasswordInfo(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="user-table">
        {users.map((user) => (
          <div key={user.user_id} className="user-row">
            <div>
              <strong>{user.full_name}</strong>
              <p>{user.email}</p>
            </div>
            <div className="user-actions">
              <select
                value={user.role}
                onChange={(e) =>
                  updateUser(user.user_id, { role: e.target.value })
                }
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              {['it_agent', 'it_manager', 'system_admin'].includes(user.role) && (
                <button
                  className="btn ghost"
                  onClick={async () => {
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
                    } catch (err) {
                      alert(err.response?.data?.message || "Failed to reset password");
                    }
                  }}
                  title="Reset password for this user"
                >
                  Reset Password
                </button>
              )}
              <button
                className="btn ghost"
                onClick={() =>
                  updateUser(user.user_id, { is_active: !user.is_active })
                }
              >
                {user.is_active ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsersPage;
