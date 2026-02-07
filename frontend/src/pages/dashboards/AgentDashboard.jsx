import React, { useEffect, useState } from "react";
import apiClient from "../../api/client";

const AgentDashboard = () => {
  const [stats, setStats] = useState({
    assigned: 0,
    inProgress: 0,
    pending: 0,
  });

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.get("/tickets");
      const tickets = res.data.data.tickets || [];
      setStats({
        assigned: tickets.length,
        inProgress: tickets.filter((t) => t.status === "In Progress").length,
        pending: tickets.filter((t) => t.status === "Pending").length,
      });
    };

    load();
  }, []);

  return (
    <div className="dashboard-grid">
      <div className="panel stat-card">
        <h3>Assigned Tickets</h3>
        <strong>{stats.assigned}</strong>
      </div>
      <div className="panel stat-card">
        <h3>In Progress</h3>
        <strong>{stats.inProgress}</strong>
      </div>
      <div className="panel stat-card">
        <h3>Pending</h3>
        <strong>{stats.pending}</strong>
      </div>
    </div>
  );
};

export default AgentDashboard;
