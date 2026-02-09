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

  const totalTickets =
    (statusSummary.open || 0) +
    (statusSummary.in_progress || 0) +
    (statusSummary.pending || 0) +
    (statusSummary.resolved || 0) +
    (statusSummary.closed || 0);
  const activeTickets =
    (statusSummary.open || 0) +
    (statusSummary.in_progress || 0) +
    (statusSummary.pending || 0);
  const resolvedTotal =
    (statusSummary.resolved || 0) + (statusSummary.closed || 0);
  const formatPercent = (value, total) =>
    total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
  const activePercent = formatPercent(activeTickets, totalTickets);
  const resolvedPercent = formatPercent(resolvedTotal, totalTickets);
  const breachPercent = formatPercent(slaSummary.total_breached || 0, totalTickets);

  const statusCards = [
    { label: "Open", value: statusSummary.open || 0 },
    { label: "In Progress", value: statusSummary.in_progress || 0 },
    { label: "Pending", value: statusSummary.pending || 0 },
    { label: "Resolved", value: statusSummary.resolved || 0 },
    { label: "Closed", value: statusSummary.closed || 0 },
  ];

  return (
    <div className="admin-dashboard">
      {error && <div className="panel error">{error}</div>}

      <section className="panel admin-hero">
        <div className="admin-hero-main">
          <span className="admin-label">Admin Overview</span>
          <h3>Service Desk Health</h3>
          <p className="admin-subtext">
            Monitor workload, resolution pace, and SLA exposure in real time.
          </p>
          <div className="admin-hero-metrics">
            <div className="admin-kpi">
              <span>Total Users</span>
              <strong>{users}</strong>
            </div>
            <div className="admin-kpi">
              <span>Total Tickets</span>
              <strong>{totalTickets}</strong>
            </div>
            <div className="admin-kpi">
              <span>Active Work</span>
              <strong>{activeTickets}</strong>
              <em>{activePercent} of total</em>
            </div>
          </div>
        </div>
        <div className="admin-hero-side">
          <div className="admin-alert">
            <span>SLA Watch</span>
            <strong>{slaSummary.critical_breached || 0}</strong>
            <em>critical breaches</em>
            <div className="admin-progress">
              <div className="admin-progress-bar">
                <div
                  className="admin-progress-fill danger"
                  style={{ width: breachPercent }}
                />
              </div>
              <span>{breachPercent} breached</span>
            </div>
          </div>
          <div className="admin-alert muted">
            <span>Resolution Pace</span>
            <strong>{resolvedTotal}</strong>
            <em>{resolvedPercent} resolved</em>
            <div className="admin-progress">
              <div className="admin-progress-bar">
                <div
                  className="admin-progress-fill success"
                  style={{ width: resolvedPercent }}
                />
              </div>
              <span>{resolvedPercent} closed</span>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-grid">
        {statusCards.map((card) => (
          <div key={card.label} className="panel admin-status-card">
            <span className="status-pill">{card.label}</span>
            <strong>{card.value}</strong>
            <em>{formatPercent(card.value, totalTickets)} of total</em>
          </div>
        ))}
        <div className="panel admin-status-card emphasis">
          <span className="status-pill">Total SLA Breached</span>
          <strong>{slaSummary.total_breached || 0}</strong>
          <em>{breachPercent} of total</em>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
