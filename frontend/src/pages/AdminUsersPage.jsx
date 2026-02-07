import React, { useEffect, useState } from "react";
import apiClient from "../api/client";

const roleOptions = ["end_user", "it_agent", "it_manager", "system_admin"];

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);

  const load = async () => {
    const res = await apiClient.get("/users");
    setUsers(res.data.data.users || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateUser = async (id, updates) => {
    await apiClient.patch(`/users/${id}`, updates);
    load();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>User Management</h2>
          <p>Manage roles and access.</p>
        </div>
      </div>
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
