import React, { useEffect, useState } from "react";
import apiClient from "../../api/client";

const AdminDashboard = () => {
  const [users, setUsers] = useState(0);
  const [statusSummary, setStatusSummary] = useState({
    open: 0,
    in_progress: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
  });
  const [slaSummary, setSlaSummary] = useState({
    total_breached: 0,
    critical_breached: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const [usersRes, statusRes, slaRes] = await Promise.all([
          apiClient.get("/users"),
          apiClient.get("/dashboard/status-summary"),
          apiClient.get("/dashboard/sla-summary"),
        ]);
        setUsers(usersRes.data.data.users?.length || 0);
        setStatusSummary(statusRes.data.data.summary || {});
        setSlaSummary(slaRes.data.data.summary || {});
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      }
    };

    load();
  }, []);

  return (
    <div className="dashboard-grid">
      {error && <div className="panel error">{error}</div>}
      <div className="panel stat-card">
        <h3>Total Users</h3>
        <strong>{users}</strong>
      </div>
      <div className="panel stat-card">
        <h3>Open Tickets</h3>
        <strong>{statusSummary.open || 0}</strong>
      </div>
      <div className="panel stat-card">
        <h3>In Progress</h3>
        <strong>{statusSummary.in_progress || 0}</strong>
      </div>
      <div className="panel stat-card">
        <h3>Pending</h3>
        <strong>{statusSummary.pending || 0}</strong>
      </div>
      <div className="panel stat-card">
        <h3>Resolved</h3>
        <strong>{statusSummary.resolved || 0}</strong>
      </div>
      <div className="panel stat-card">
        <h3>Closed</h3>
        <strong>{statusSummary.closed || 0}</strong>
      </div>
      <div className="panel stat-card">
        <h3>Critical SLA Breach</h3>
        <strong>{slaSummary.critical_breached || 0}</strong>
      </div>
      <div className="panel stat-card">
        <h3>Total SLA Breached</h3>
        <strong>{slaSummary.total_breached || 0}</strong>
      </div>
    </div>
  );
};

export default AdminDashboard;
