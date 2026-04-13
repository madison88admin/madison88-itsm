import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import { onDashboardRefresh } from "../../api/socket";
import ExecutiveDashboard from "./ExecutiveDashboard";

const DATE_SCOPE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "custom", label: "Custom range" },
];

const toISODate = (date) => new Date(date).toISOString().slice(0, 10);

const getDateRange = (scope, customStart, customEnd) => {
  const now = new Date();
  const end = toISODate(now);
  if (scope === "custom") {
    const safeStart = customStart || end;
    const safeEnd = customEnd || safeStart;
    return {
      start: safeStart <= safeEnd ? safeStart : safeEnd,
      end: safeEnd >= safeStart ? safeEnd : safeStart,
    };
  }
  if (scope === "today") {
    return { start: end, end };
  }
  const days = scope === "30d" ? 30 : 7;
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (days - 1));
  return { start: toISODate(startDate), end };
};

const AdminDashboard = () => {
  const [viewMode, setViewMode] = useState(localStorage.getItem('adminViewMode') || 'detailed');
  const [users, setUsers] = useState(0);
  const [agentStatusMatrix, setAgentStatusMatrix] = useState([]);
  const [ticketsByLocation, setTicketsByLocation] = useState([]);
  const [exportTickets, setExportTickets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateScope, setDateScope] = useState("7d");
  const [customDateStart, setCustomDateStart] = useState(() => getDateRange("30d").start);
  const [customDateEnd, setCustomDateEnd] = useState(() => getDateRange("30d").end);
  const [locationScope, setLocationScope] = useState("all");
  const [teamScope, setTeamScope] = useState("all");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [healthState, setHealthState] = useState("unknown");
  const [refreshLatencyMs, setRefreshLatencyMs] = useState(0);
  const navigate = useNavigate();

  const toggleViewMode = () => {
    const newMode = viewMode === 'detailed' ? 'simple' : 'detailed';
    setViewMode(newMode);
    localStorage.setItem('adminViewMode', newMode);
  };

  const handleDrillDown = (params = {}) => {
    const { start, end } = getDateRange(dateScope, customDateStart, customDateEnd);
    const merged = {
      ...params,
      date_from: params.date_from || start,
      date_to: params.date_to || end,
    };
    if (locationScope !== "all" && !merged.location) {
      merged.location = locationScope;
    }
    const searchParams = new URLSearchParams(merged);
    navigate(`/tickets?${searchParams.toString()}`);
  };

  const load = useCallback(async () => {
    const startTick = performance.now();
    setLoading(true);
    setError("");
    try {
      const { start, end } = getDateRange(dateScope, customDateStart, customDateEnd);
      const settled = await Promise.allSettled([
        apiClient.get("/users"),
        apiClient.get("/dashboard/status-summary"),
        apiClient.get("/dashboard/sla-summary"),
        apiClient.get("/dashboard/advanced-reporting"),
        apiClient.get("/dashboard/ticket-volume"),
        apiClient.get("/dashboard/export", { params: { start_date: start, end_date: end } }),
      ]);

      const usersRes = settled[0].status === "fulfilled" ? settled[0].value : null;
      const statusRes = settled[1].status === "fulfilled" ? settled[1].value : null;
      const slaRes = settled[2].status === "fulfilled" ? settled[2].value : null;
      const reportingRes = settled[3].status === "fulfilled" ? settled[3].value : null;
      const volumeRes = settled[4].status === "fulfilled" ? settled[4].value : null;
      const exportRes = settled[5].status === "fulfilled" ? settled[5].value : null;

      if (!usersRes || !statusRes || !slaRes || !reportingRes || !volumeRes || !exportRes) {
        setHealthState("degraded");
      } else {
        setHealthState("healthy");
      }

      if (usersRes) setUsers(usersRes.data.data.users?.length || 0);
      if (reportingRes) setAgentStatusMatrix(reportingRes.data.data.agent_status_matrix || []);
      if (volumeRes) setTicketsByLocation(volumeRes.data.data.ticket_volume?.by_location || []);
      if (exportRes) setExportTickets(exportRes.data.data.tickets || []);

      // Normalize priority data to ensure P1-P4 are always present
      const priorityRaw = volumeRes?.data?.data?.ticket_volume?.by_priority || [];
      const priorityMap = priorityRaw.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      setLastUpdatedAt(new Date());
      setRefreshLatencyMs(Math.round(performance.now() - startTick));

    } catch (err) {
      setHealthState("degraded");
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [dateScope, customDateStart, customDateEnd]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = onDashboardRefresh(() => load());
    return unsubscribe;
  }, [load]);

  const scopedTickets = useMemo(() => {
    if (!Array.isArray(exportTickets)) return [];
    return exportTickets.filter((ticket) => {
      if (locationScope !== "all" && ticket.location !== locationScope) return false;
      return true;
    });
  }, [exportTickets, locationScope]);

  const scopedStatusSummary = useMemo(() => {
    return scopedTickets.reduce(
      (acc, ticket) => {
        const status = String(ticket.status || "").toLowerCase();
        if (status === "new") acc.open += 1;
        else if (status === "in progress") acc.in_progress += 1;
        else if (status === "pending") acc.pending += 1;
        else if (status === "resolved") acc.resolved += 1;
        else if (status === "closed") acc.closed += 1;
        return acc;
      },
      { open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 },
    );
  }, [scopedTickets]);

  const scopedSlaSummary = useMemo(() => {
    const now = Date.now();
    let total_breached = 0;
    let critical_breached = 0;
    scopedTickets.forEach((ticket) => {
      const status = String(ticket.status || "").toLowerCase();
      if (["resolved", "closed"].includes(status)) return;
      if (!ticket.sla_due_date) return;
      const due = new Date(ticket.sla_due_date).getTime();
      if (!Number.isFinite(due) || due >= now) return;
      total_breached += 1;
      if (String(ticket.priority || "").toUpperCase() === "P1") critical_breached += 1;
    });
    return { total_breached, critical_breached };
  }, [scopedTickets]);

  const scopedPriority = useMemo(() => {
    const map = { P1: 0, P2: 0, P3: 0, P4: 0 };
    scopedTickets.forEach((ticket) => {
      const priority = String(ticket.priority || "").toUpperCase();
      if (map[priority] != null) map[priority] += 1;
    });
    return ["P1", "P2", "P3", "P4"].map((key) => ({ key, value: map[key] || 0 }));
  }, [scopedTickets]);

  const scopedLocations = useMemo(() => {
    const map = new Map();
    scopedTickets.forEach((ticket) => {
      const key = ticket.location || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
  }, [scopedTickets]);

  const scopedCategories = useMemo(() => {
    const map = new Map();
    scopedTickets.forEach((ticket) => {
      const key = ticket.category || "Other";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
  }, [scopedTickets]);

  const topCategory = scopedCategories[0] || null;

  const allLocationOptions = useMemo(() => {
    if (!Array.isArray(exportTickets) || exportTickets.length === 0) return ticketsByLocation;
    const map = new Map();
    exportTickets.forEach((ticket) => {
      const key = ticket.location || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
  }, [exportTickets, ticketsByLocation]);

  const totalTickets =
    (scopedStatusSummary.open || 0) +
    (scopedStatusSummary.in_progress || 0) +
    (scopedStatusSummary.pending || 0) +
    (scopedStatusSummary.resolved || 0) +
    (scopedStatusSummary.closed || 0);
  const activeTickets =
    (scopedStatusSummary.open || 0) +
    (scopedStatusSummary.in_progress || 0) +
    (scopedStatusSummary.pending || 0);
  const resolvedTotal =
    (scopedStatusSummary.resolved || 0) + (scopedStatusSummary.closed || 0);
  const formatPercent = (value, total) =>
    total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
  const activePercent = formatPercent(activeTickets, totalTickets);
  const resolvedPercent = formatPercent(resolvedTotal, totalTickets);
  const breachPercent = formatPercent(scopedSlaSummary.total_breached || 0, totalTickets);

  const statusCards = [
    { label: "Open", value: scopedStatusSummary.open || 0 },
    { label: "In Progress", value: scopedStatusSummary.in_progress || 0 },
    { label: "Pending", value: scopedStatusSummary.pending || 0 },
    { label: "Resolved", value: scopedStatusSummary.resolved || 0 },
    { label: "Closed", value: scopedStatusSummary.closed || 0 },
  ];
  const statusKeys = [
    { key: "new_count", label: "New", color: "47, 215, 255" },
    { key: "in_progress_count", label: "In Progress", color: "43, 107, 255" },
    { key: "pending_count", label: "Pending", color: "255, 181, 71" },
    { key: "resolved_count", label: "Resolved", color: "55, 217, 150" },
    { key: "closed_count", label: "Closed", color: "139, 151, 186" },
    { key: "reopened_count", label: "Reopened", color: "255, 93, 108" },
  ];
  const maxHeatCount = agentStatusMatrix.reduce((max, row) => {
    const rowMax = statusKeys.reduce((innerMax, status) => {
      const value = row[status.key] || 0;
      return value > innerMax ? value : innerMax;
    }, 0);
    return rowMax > max ? rowMax : max;
  }, 0);

  const teamOptions = useMemo(() => {
    const unique = new Set();
    agentStatusMatrix.forEach((row) => {
      if (row.team_name) unique.add(row.team_name);
    });
    return ["all", ...Array.from(unique)];
  }, [agentStatusMatrix]);

  const visibleHeatmapRows = useMemo(() => {
    if (teamScope === "all") return agentStatusMatrix;
    return agentStatusMatrix.filter((row) => row.team_name === teamScope);
  }, [agentStatusMatrix, teamScope]);

  const actionableAlerts = [
    {
      key: "critical-breach",
      severity: "critical",
      text: `${scopedSlaSummary.critical_breached || 0} critical SLA breaches`,
      hidden: !(scopedSlaSummary.critical_breached > 0),
      params: { status: "New,In Progress,Pending", priority: "P1" },
    },
    {
      key: "pending-aging",
      severity: "warn",
      text: `${scopedStatusSummary.pending || 0} tickets waiting in Pending`,
      hidden: !(scopedStatusSummary.pending > 0),
      params: { status: "Pending" },
    },
    {
      key: "active-spike",
      severity: "info",
      text: `${activeTickets} active tickets in current scope`,
      hidden: !(activeTickets >= 10),
      params: { status: "New,In Progress,Pending" },
    },
  ].filter((item) => !item.hidden);

  if (viewMode === 'simple') {
    return <ExecutiveDashboard loadDetailView={() => setViewMode('detailed')} />;
  }

  const scopeSelectStyle = {
    background: "rgba(15, 23, 42, 0.85)",
    color: "#e2e8f0",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    borderRadius: "10px",
    padding: "0.42rem 2rem 0.42rem 0.65rem",
    minHeight: "36px",
    fontSize: "0.85rem",
    fontWeight: 600,
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.6rem center",
    backgroundSize: "12px",
  };

  return (
    <div className="admin-dashboard animate-fadeIn">
      <section className="panel scope-bar" style={{ position: "sticky", top: 8, zIndex: 20, marginBottom: "1rem", padding: "0.9rem 1rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={dateScope}
              onChange={(e) => setDateScope(e.target.value)}
              style={scopeSelectStyle}
            >
              {DATE_SCOPE_OPTIONS.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
            </select>
            {dateScope === "custom" && (
              <>
                <input
                  type="date"
                  value={customDateStart}
                  max={customDateEnd || undefined}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  style={scopeSelectStyle}
                />
                <input
                  type="date"
                  value={customDateEnd}
                  min={customDateStart || undefined}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  style={scopeSelectStyle}
                />
              </>
            )}
            <select
              value={locationScope}
              onChange={(e) => setLocationScope(e.target.value)}
              style={scopeSelectStyle}
            >
              <option value="all">All Locations</option>
              {allLocationOptions.map((item) => (
                <option key={item.key || "unknown"} value={item.key || "Unknown"}>{item.key || "Unknown"}</option>
              ))}
            </select>
            <select
              value={teamScope}
              onChange={(e) => setTeamScope(e.target.value)}
              disabled={teamOptions.length <= 1}
              style={{
                ...scopeSelectStyle,
                opacity: teamOptions.length <= 1 ? 0.55 : 1,
                cursor: teamOptions.length <= 1 ? "not-allowed" : "pointer",
              }}
            >
              <option value="all">All Teams</option>
              {teamOptions.filter((v) => v !== "all").map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "0.55rem", alignItems: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
            <span className={`status-pill ${healthState === "healthy" ? "badge-resolved" : "badge-pending"}`} style={{ textTransform: "uppercase" }}>
              {healthState === "healthy" ? "Healthy" : "Needs Attention"}
            </span>
            <span>Last updated: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "--:--"}</span>
            <span>Latency: {refreshLatencyMs}ms</span>
          </div>
        </div>
      </section>

      {actionableAlerts.length > 0 && (
        <section className="panel" style={{ marginBottom: "1rem", padding: "0.8rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.6rem" }}>
            {actionableAlerts.map((alert) => (
              <button
                key={alert.key}
                type="button"
                onClick={() => handleDrillDown(alert.params)}
                className="hover-lift"
                style={{
                  textAlign: "left",
                  border: `1px solid ${alert.severity === "critical" ? "rgba(239,68,68,0.45)" : alert.severity === "warn" ? "rgba(245,158,11,0.45)" : "rgba(56,189,248,0.45)"}`,
                  background: "rgba(2,6,23,0.65)",
                  borderRadius: "12px",
                  padding: "0.7rem 0.8rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                {alert.text}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="view-mode-toggle-container" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn-press hover-lift"
          onClick={toggleViewMode}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            color: '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Switch to Executive View
        </button>
      </div>

      {error && <div className="panel error">{error}</div>}

      <section className="panel admin-hero">
        <div className="admin-hero-main">
          <span className="admin-label">Admin Overview</span>
          <h3>Service Desk Health</h3>
          <p className="admin-subtext">
            Monitor workload, resolution pace, and SLA exposure in real time.
          </p>
          <div className="admin-hero-metrics">
            <div className="admin-kpi hover-lift">
              <span>Total Users</span>
              {loading ? <div className="skeleton-shimmer" style={{ height: '32px', width: '60px', marginTop: '4px' }} /> : <strong>{users}</strong>}
            </div>
            <div className="admin-kpi hover-lift">
              <span>Total Tickets</span>
              {loading ? <div className="skeleton-shimmer" style={{ height: '32px', width: '60px', marginTop: '4px' }} /> : <strong>{totalTickets}</strong>}
            </div>
            <div className="admin-kpi hover-lift">
              <span>Active Work</span>
              {loading ? <div className="skeleton-shimmer" style={{ height: '32px', width: '60px', marginTop: '4px' }} /> : <strong>{activeTickets}</strong>}
              {loading ? <div className="skeleton-shimmer" style={{ height: '14px', width: '80px', marginTop: '4px' }} /> : <em>{activePercent} of total</em>}
            </div>
            <div className="admin-kpi hover-lift">
              <span>Top Category</span>
              {loading ? <div className="skeleton-shimmer" style={{ height: '32px', width: '120px', marginTop: '4px' }} /> : <strong>{topCategory?.key || "No data"}</strong>}
              {loading ? <div className="skeleton-shimmer" style={{ height: '14px', width: '80px', marginTop: '4px' }} /> : <em>{topCategory ? `${topCategory.value} tickets` : "0 tickets"}</em>}
            </div>
          </div>
        </div>
        <div className="admin-hero-side">
          <div className="admin-alert">
            <span>SLA Watch</span>
            <strong>{scopedSlaSummary.critical_breached || 0}</strong>
            <em>critical breaches</em>
            <div className="admin-progress">
              <div className="admin-progress-bar">
                <div
                  className={`admin-progress-fill danger ${!loading ? 'sla-progress-animated' : ''}`}
                  style={{ width: loading ? '0%' : breachPercent }}
                />
              </div>
              {loading ? <div className="skeleton-shimmer" style={{ height: '14px', width: '100px', marginTop: '4px' }} /> : <span>{breachPercent} breached</span>}
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
          <div
            key={card.label}
            className="panel admin-status-card hover-lift cascade-item"
            style={{ cursor: 'pointer' }}
            onClick={() => handleDrillDown({ status: card.label })}
          >
            <span className="status-pill">{card.label}</span>
            {loading ? <div className="skeleton-shimmer" style={{ height: '32px', width: '80px', marginTop: '8px' }} /> : <strong>{card.value}</strong>}
            {loading ? <div className="skeleton-shimmer" style={{ height: '14px', width: '100px', marginTop: '4px' }} /> : <em>{formatPercent(card.value, totalTickets)} of total</em>}
          </div>
        ))}
        <div className="panel admin-status-card emphasis">
          <span className="status-pill">Total SLA Breached</span>
          <strong>{scopedSlaSummary.total_breached || 0}</strong>
          <em>{breachPercent} of total</em>
        </div>
      </section>

      <section className="panel">
        <h3>Tickets by Category</h3>
        <p className="muted">See which ticket types are most common for the selected date range.</p>
        {scopedCategories.length === 0 ? (
          <div className="empty-state">No category data in this date range.</div>
        ) : (
          <div className="location-cards">
            {scopedCategories.map((item, index) => (
              <div
                key={item.key}
                className="location-card hover-lift"
                style={{
                  cursor: 'pointer',
                  borderLeft: `3px solid ${index === 0 ? 'rgba(94,234,212,0.9)' : 'rgba(59,130,246,0.55)'}`,
                }}
                onClick={() => handleDrillDown({ category: item.key })}
              >
                <span className="location-label">
                  {index === 0 ? `TOP CATEGORY · ${item.key}` : item.key}
                </span>
                <strong>{item.value}</strong>
                <em>{formatPercent(item.value, totalTickets)} of total</em>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Tickets by Priority</h3>
        <p className="muted">Total ticket distribution across priority levels.</p>
        <div className="location-cards">
          {scopedPriority.map((item) => (
            <div
              key={item.key}
              className={`location-card hover-lift priority-${item.key.toLowerCase()}`}
              style={{ cursor: 'pointer', borderLeft: `3px solid var(--p-${item.key.toLowerCase()}-color, #3b82f6)` }}
              onClick={() => handleDrillDown({ priority: item.key })}
            >
              <span className="location-label">
                {item.key} TICKETS
              </span>
              {loading ? <div className="skeleton-shimmer" style={{ height: '24px', width: '40px', marginTop: '4px' }} /> : <strong>{item.value}</strong>}
              {loading ? <div className="skeleton-shimmer" style={{ height: '12px', width: '60px', marginTop: '2px' }} /> : <em>{formatPercent(item.value, totalTickets)}</em>}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Tickets by Location</h3>
        <p className="muted">Number of tickets submitted per location.</p>
        {scopedLocations.length === 0 ? (
          <div className="empty-state">No location data.</div>
        ) : (
          <div className="location-cards">
            {scopedLocations.map((item) => (
              <div
                key={item.key || "unknown"}
                className="location-card hover-lift"
                style={{ cursor: 'pointer' }}
                onClick={() => handleDrillDown({ location: item.key })}
              >
                <span className="location-label">
                  {item.key || "Unknown"}
                </span>
                <strong>{item.value}</strong>
                <em>tickets</em>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Agent Status Heatmap</h3>
        {visibleHeatmapRows.length === 0 ? (
          <div className="empty-state">No status data.</div>
        ) : (
          <div className="heatmap">
            <div className="heatmap-row header">
              <span>Agent</span>
              {statusKeys.map((status) => (
                <span key={status.key}>{status.label}</span>
              ))}
            </div>
            {visibleHeatmapRows.map((row) => (
              <div key={row.user_id} className="heatmap-row">
                <span className="heatmap-agent">
                  {row.full_name || "Agent"}
                </span>
                {statusKeys.map((status) => {
                  const value = row[status.key] || 0;
                  const intensity = maxHeatCount
                    ? Math.max(0.12, (value / maxHeatCount) * 0.7)
                    : 0.12;
                  return (
                    <span
                      key={status.key}
                      className="heatmap-cell"
                      style={{
                        background: `rgba(${status.color}, ${intensity})`,
                      }}
                    >
                      {value}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
