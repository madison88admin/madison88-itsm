import React, { useEffect, useState } from "react";
import apiClient from "../../api/client";

const UserDashboard = () => {
  const [stats, setStats] = useState({ open: 0, pending: 0, resolved: 0 });

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.get("/tickets");
      const tickets = res.data.data.tickets || [];
      setStats({
        open: tickets.filter((t) => ["New", "In Progress"].includes(t.status))
          .length,
        pending: tickets.filter((t) => t.status === "Pending").length,
        resolved: tickets.filter((t) =>
          ["Resolved", "Closed"].includes(t.status),
        ).length,
      });
    };

    load();
  }, []);

  return (
    <div className="dashboard-grid">
      <div className="panel stat-card">
        <h3>Open Tickets</h3>
        <strong>{stats.open}</strong>
      </div>
      <div className="panel stat-card">
        <h3>Pending Responses</h3>
        <strong>{stats.pending}</strong>
      </div>
      <div className="panel stat-card">
        <h3>Resolved</h3>
        <strong>{stats.resolved}</strong>
      </div>
    </div>
  );
};

export default UserDashboard;
