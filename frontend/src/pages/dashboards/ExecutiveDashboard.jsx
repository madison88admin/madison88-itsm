import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import { onDashboardRefresh } from "../../api/socket";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiMessageSquare,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const parseStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (err) {
    return null;
  }
};

const toDayLabel = (day) =>
  new Date(day).toLocaleDateString("en-US", { weekday: "short" });

const toDateTimeLabel = (value) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const toLocalYmd = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const trendDefinitions = {
  volume: {
    key: "tickets_by_day",
    label: "Ticket Volume",
    color: "#3b82f6",
    fillColor: "rgba(59, 130, 246, 0.12)",
  },
  breaches: {
    key: "sla_breaches_by_day",
    label: "SLA Breaches",
    color: "#f59e0b",
    fillColor: "rgba(245, 158, 11, 0.12)",
  },
  mttr: {
    key: "mttr_by_day",
    label: "MTTR (Hours)",
    color: "#22c55e",
    fillColor: "rgba(34, 197, 94, 0.12)",
  },
};

const ExecutiveDashboard = ({ loadDetailView }) => {
  const navigate = useNavigate();
  const currentUser = useMemo(() => parseStoredUser(), []);
  const [data, setData] = useState({
    summary: { open: 0, resolved: 0, compliance: 0 },
    health: { status: "optimal", text: "All systems operational", checks: [] },
    recentEvents: [],
    pulseLastUpdated: null,
    adminActivity: [],
    trends: {
      tickets_by_day: [],
      sla_breaches_by_day: [],
      mttr_by_day: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [trendMode, setTrendMode] = useState("volume");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTemplates, setBroadcastTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [audienceCount, setAudienceCount] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const fetchData = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila";
      const [statusRes, reportingRes, pulseRes] = await Promise.all([
        apiClient.get("/dashboard/status-summary", { params: { timezone } }),
        apiClient.get("/dashboard/advanced-reporting"),
        apiClient.get("/dashboard/pulse"),
      ]);

      const status = statusRes.data.data.summary || {};
      const advanced = reportingRes.data.data || {};
      const pulse = pulseRes.data.data || {};

      setData({
        summary: {
          open: status.open || 0,
          resolved: status.resolved_today || 0,
          compliance: advanced.trends?.sla_compliance_by_week?.[0]?.compliance ?? 0,
        },
        health: pulse.systemHealth || { status: "optimal", text: "Systems Operational", checks: [] },
        recentEvents: pulse.events?.slice(0, 7) || [],
        pulseLastUpdated: pulse.lastUpdated || null,
        adminActivity: pulse.adminActivity || [],
        trends: {
          tickets_by_day: advanced.trends?.tickets_by_day || [],
          sla_breaches_by_day: advanced.trends?.sla_breaches_by_day || [],
          mttr_by_day: advanced.trends?.mttr_by_day || [],
        },
      });
    } catch (err) {
      console.error("Failed to fetch executive data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = onDashboardRefresh(() => fetchData());
    return unsubscribe;
  }, []);

  const loadBroadcastGovernance = async () => {
    try {
      const res = await apiClient.get("/dashboard/broadcast-governance");
      const payload = res.data.data || {};
      setBroadcastTemplates(payload.templates || []);
      setAudienceCount(payload.audience_count || 0);
      setCooldownRemaining(payload.cooldown_remaining_seconds || 0);
    } catch (err) {
      console.error("Failed to load broadcast governance", err);
    }
  };

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const trendChartData = useMemo(() => {
    const trend = trendDefinitions[trendMode];
    const rows = (data.trends?.[trend.key] || [])
      .map((row) => ({
        day: row.day,
        value: Number(row.count || 0),
      }))
      .sort((a, b) => new Date(a.day) - new Date(b.day));

    const labels = rows.map((row) => toDayLabel(row.day));
    const values = rows.map((row) => row.value);
    const mean = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
    const variance =
      values.length > 0
        ? values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
        : 0;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + stdDev * 1.5;
    const anomalies = values.map((v) => v >= threshold && v > 0);

    return {
      labels,
      datasets: [
        {
          label: trend.label,
          data: values,
          fill: true,
          backgroundColor: trend.fillColor,
          borderColor: trend.color,
          tension: 0.35,
          pointRadius: anomalies.map((isAnomaly) => (isAnomaly ? 6 : 4)),
          pointBackgroundColor: anomalies.map((isAnomaly) =>
            isAnomaly ? "#ef4444" : trend.color
          ),
          pointBorderColor: anomalies.map((isAnomaly) =>
            isAnomaly ? "#ef4444" : trend.color
          ),
          pointHoverRadius: anomalies.map((isAnomaly) => (isAnomaly ? 8 : 6)),
        },
      ],
    };
  }, [data.trends, trendMode]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "#94a3b8",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 10 } },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#64748b", font: { size: 10 } },
      },
    },
  };

  const handleKpiClick = (filter) => {
    const scopedFilter = { ...filter };
    if (currentUser?.location && ["it_agent", "it_manager", "system_admin"].includes(currentUser?.role)) {
      scopedFilter.location = currentUser.location;
    }
    const params = new URLSearchParams(scopedFilter);
    navigate(`/tickets?${params.toString()}`);
  };

  const handleExport = () => {
    const token = localStorage.getItem("token");
    const url = `${process.env.REACT_APP_API_URL || ""}/api/dashboard/export?format=csv&token=${token}`;
    window.open(url, "_blank");
  };

  const openBroadcastModal = async () => {
    await loadBroadcastGovernance();
    setShowBroadcastModal(true);
  };

  const onTemplateChange = (templateKey) => {
    setSelectedTemplate(templateKey);
    const template = broadcastTemplates.find((item) => item.key === templateKey);
    if (template) {
      setBroadcastMessage(template.message || "");
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() || sendingBroadcast || cooldownRemaining > 0) return;
    setSendingBroadcast(true);
    try {
      await apiClient.post("/dashboard/broadcast", {
        message: broadcastMessage.trim(),
        template_key: selectedTemplate || null,
      });
      await loadBroadcastGovernance();
      fetchData();
      if (cooldownRemaining <= 0) setCooldownRemaining(60);
      setBroadcastMessage("");
      setSelectedTemplate("");
      setShowBroadcastModal(false);
    } catch (err) {
      window.alert(err.response?.data?.message || "Failed to send broadcast");
      await loadBroadcastGovernance();
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleBulkEscalate = async () => {
    try {
      const res = await apiClient.post("/dashboard/bulk-escalate-p1");
      window.alert(res.data.message);
      fetchData();
    } catch (err) {
      window.alert("Failed to escalate tickets");
    } finally {
      setShowEscalateModal(false);
    }
  };

  return (
    <div className="exec-dashboard animate-fadeIn">
      <header className="exec-header">
        <div className="exec-title">
          <h1>Command Center</h1>
          <p>Global System Oversight</p>
        </div>

        <div className={`system-heartbeat ${loading ? "loading" : data.health.status}`}>
          <div className="heartbeat-pulse"></div>
          <div className="heartbeat-info">
            <span className="heartbeat-label">System Status</span>
            {loading ? (
              <div className="skeleton-shimmer" style={{ height: "24px", width: "120px", marginTop: "4px", borderRadius: "4px" }} />
            ) : (
              <>
                <strong className="heartbeat-text">{data.health.text}</strong>
                <div className="health-checks">
                  {(data.health.checks || []).slice(0, 4).map((check) => (
                    <span key={check.key} className={`health-check ${check.status}`}>
                      {check.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="exec-grid">
        <div className="exec-main-content">
          <div className="kpi-row">
            <div
              className="kpi-card hover-lift"
              onClick={() => handleKpiClick({ status: "New,In Progress,Pending" })}
            >
              <div className="kpi-icon active"><FiActivity /></div>
              <div className="kpi-data">
                <span>Active Issues</span>
                {loading ? (
                  <div className="skeleton-shimmer" style={{ height: "32px", width: "60px", marginTop: "8px", borderRadius: "8px" }} />
                ) : (
                  <strong>{data.summary.open}</strong>
                )}
              </div>
            </div>

            <div className="kpi-card hover-lift">
              <div className="kpi-icon compliance"><FiZap /></div>
              <div className="kpi-data">
                <span>SLA Compliance</span>
                {loading ? (
                  <div className="skeleton-shimmer" style={{ height: "32px", width: "80px", marginTop: "8px", borderRadius: "8px" }} />
                ) : (
                  <strong>{Math.round(data.summary.compliance)}%</strong>
                )}
              </div>
            </div>

            <div
              className="kpi-card hover-lift"
              onClick={() => {
                const today = toLocalYmd();
                handleKpiClick({
                  status: "Resolved",
                  include_archived: "true",
                  date_from: today,
                });
              }}
            >
              <div className="kpi-icon resolved"><FiCheckCircle /></div>
              <div className="kpi-data">
                <span>Resolved Today</span>
                {loading ? (
                  <div className="skeleton-shimmer" style={{ height: "32px", width: "60px", marginTop: "8px", borderRadius: "8px" }} />
                ) : (
                  <strong>{data.summary.resolved}</strong>
                )}
              </div>
            </div>
          </div>

          <section className="trend-section glass-panel">
            <div className="section-header">
              <h3>Performance Trend</h3>
              <div className="trend-toggle">
                <button className={trendMode === "volume" ? "active" : ""} onClick={() => setTrendMode("volume")}>Volume</button>
                <button className={trendMode === "breaches" ? "active" : ""} onClick={() => setTrendMode("breaches")}>SLA Breach</button>
                <button className={trendMode === "mttr" ? "active" : ""} onClick={() => setTrendMode("mttr")}>MTTR</button>
              </div>
            </div>
            <div className="chart-container" style={{ height: "220px", position: "relative" }}>
              {trendChartData.labels.length > 0 ? (
                <Line data={trendChartData} options={chartOptions} />
              ) : (
                <div className="skeleton-shimmer" style={{ height: "100%", borderRadius: "12px" }} />
              )}
            </div>
          </section>

          <section className="pulse-section glass-panel">
            <div className="section-header">
              <h3>Live Activity Pulse</h3>
              <div className="pulse-meta">
                <FiClock className="muted" />
                <small className="muted">
                  Last updated {data.pulseLastUpdated ? toDateTimeLabel(data.pulseLastUpdated) : "-"}
                </small>
              </div>
            </div>
            <div className="pulse-list">
              {data.recentEvents.map((event, idx) => (
                <div key={`${event.type}-${idx}`} className="pulse-item cascade-item" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <div className={`pulse-dot ${event.severity || "info"}`}></div>
                  <div className="pulse-content">
                    <p>{event.text}</p>
                    <small>{toDateTimeLabel(event.timestamp)}</small>
                  </div>
                  <span className={`severity-chip ${event.severity || "info"}`}>
                    {(event.severity || "info").toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="activity-section glass-panel">
            <div className="section-header">
              <h3>Admin Activity Feed</h3>
              <FiUsers className="muted" />
            </div>
            <div className="activity-feed">
              {data.adminActivity.length === 0 ? (
                <div className="empty-state">No recent admin actions.</div>
              ) : (
                data.adminActivity.map((item, idx) => (
                  <div key={`${item.action_type}-${idx}`} className="activity-item">
                    <div className="activity-main">
                      <strong>{item.actor_name || "System"}</strong>
                      <p>{item.description || item.action_type}</p>
                    </div>
                    <small>{toDateTimeLabel(item.timestamp)}</small>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="exec-sidebar">
          <div className="sidebar-group glass-panel">
            <h3>Executive Actions</h3>
            <button className="exec-action-btn hover-lift" onClick={handleExport}>
              <FiFileText /> Generate Summary Report
            </button>
            <button className="exec-action-btn hover-lift" onClick={openBroadcastModal}>
              <FiMessageSquare /> Broadcast to All Agents
            </button>
            <button className="exec-action-btn alert hover-lift" onClick={() => setShowEscalateModal(true)}>
              <FiAlertCircle /> Priority Escalate All P1s
            </button>
          </div>

          <div className="sidebar-group glass-panel view-toggle">
            <h3>Interface Mode</h3>
            <button className="mode-toggle-btn active">Simplified Executive View</button>
            <button className="mode-toggle-btn" onClick={loadDetailView}>Switch to Detailed View</button>
          </div>
        </aside>
      </div>

      {showBroadcastModal && (
        <div className="modal-overlay animate-fadeIn">
          <div className="modal-content glass-panel animate-slideUp">
            <div className="modal-header">
              <FiMessageSquare />
              <h2>Broadcast Governance</h2>
            </div>
            <div className="modal-body">
              <label className="field-label">Template Preset</label>
              <select
                value={selectedTemplate}
                onChange={(e) => onTemplateChange(e.target.value)}
                className="broadcast-input"
              >
                <option value="">Custom Message</option>
                {broadcastTemplates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.label}
                  </option>
                ))}
              </select>
              <label className="field-label">Message</label>
              <textarea
                rows={5}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="broadcast-input"
                placeholder="Type broadcast message..."
              />
              <div className="broadcast-metadata">
                <span>Audience preview: {audienceCount} users</span>
                <span className={cooldownRemaining > 0 ? "cooldown active" : "cooldown"}>
                  Cooldown: {cooldownRemaining > 0 ? `${cooldownRemaining}s` : "Ready"}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBroadcastModal(false)}>Cancel</button>
              <button
                className="btn-danger"
                onClick={handleBroadcast}
                disabled={!broadcastMessage.trim() || sendingBroadcast || cooldownRemaining > 0}
              >
                {sendingBroadcast ? "Sending..." : "Send Broadcast"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEscalateModal && (
        <div className="modal-overlay animate-fadeIn">
          <div className="modal-content glass-panel animate-slideUp">
            <div className="modal-header">
              <FiAlertCircle className="icon-warning" />
              <h2>Priority Escalation</h2>
            </div>
            <div className="modal-body">
              <p>Escalate all open P1 tickets now? This will log audit actions for each escalation.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEscalateModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleBulkEscalate}>Escalate Now</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .exec-dashboard { padding: 2rem; color: #fff; max-width: 1600px; margin: 0 auto; }
        .exec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
        .exec-title h1 { font-size: 3rem; font-weight: 800; letter-spacing: -0.03em; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .exec-title p { color: #64748b; font-size: 1.2rem; }
        .system-heartbeat { display: flex; align-items: center; gap: 1.5rem; background: rgba(15, 23, 42, 0.4); padding: 1rem 2rem; border-radius: 100px; border: 1px solid rgba(255, 255, 255, 0.05); }
        .heartbeat-pulse { width: 12px; height: 12px; border-radius: 50%; position: relative; }
        .system-heartbeat.optimal .heartbeat-pulse { background: #10b981; box-shadow: 0 0 20px #10b981; }
        .system-heartbeat.degraded .heartbeat-pulse { background: #f59e0b; box-shadow: 0 0 20px #f59e0b; }
        .system-heartbeat.critical .heartbeat-pulse { background: #ef4444; box-shadow: 0 0 20px #ef4444; }
        .heartbeat-pulse::after { content: ""; position: absolute; inset: 0; border-radius: 50%; animation: pulse 2s infinite; }
        .system-heartbeat.optimal .heartbeat-pulse::after { background: #10b981; }
        .system-heartbeat.degraded .heartbeat-pulse::after { background: #f59e0b; }
        .system-heartbeat.critical .heartbeat-pulse::after { background: #ef4444; }
        .health-checks { margin-top: 0.35rem; display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .health-check { font-size: 0.68rem; padding: 0.2rem 0.55rem; border-radius: 999px; border: 1px solid transparent; }
        .health-check.ok { color: #22c55e; border-color: rgba(34, 197, 94, 0.35); background: rgba(34, 197, 94, 0.12); }
        .health-check.warning { color: #f59e0b; border-color: rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.12); }
        .health-check.critical { color: #ef4444; border-color: rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.12); }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(3); opacity: 0; } }
        .exec-grid { display: grid; grid-template-columns: 1fr 350px; gap: 2rem; }
        .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .kpi-card { background: rgba(30, 41, 59, 0.4); padding: 2.5rem 2rem; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; gap: 1.5rem; cursor: pointer; transition: all 0.2s; }
        .kpi-card:hover { background: rgba(30, 41, 59, 0.6); border-color: rgba(255, 255, 255, 0.1); transform: translateY(-4px); }
        .kpi-icon { font-size: 2rem; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 16px; }
        .kpi-icon.active { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .kpi-icon.compliance { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .kpi-icon.resolved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .kpi-data span { color: #64748b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; }
        .kpi-data strong { display: block; font-size: 2.5rem; font-weight: 800; margin-top: 0.2rem; }
        .glass-panel { background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 24px; padding: 2rem; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; gap: 1rem; }
        .section-header h3 { font-size: 1.45rem; font-weight: 700; }
        .trend-section { margin-bottom: 2rem; }
        .trend-toggle { display: flex; gap: 0.5rem; }
        .trend-toggle button { border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.04); color: #cbd5e1; padding: 0.45rem 0.8rem; border-radius: 10px; cursor: pointer; }
        .trend-toggle button.active { background: rgba(59, 130, 246, 0.2); color: #fff; border-color: rgba(59, 130, 246, 0.45); }
        .pulse-meta { display: flex; align-items: center; gap: 0.4rem; }
        .pulse-list { display: flex; flex-direction: column; gap: 0.8rem; }
        .pulse-item { display: grid; grid-template-columns: 12px 1fr auto; align-items: center; gap: 1rem; padding: 0.9rem 1rem; background: rgba(255, 255, 255, 0.02); border-radius: 14px; }
        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; }
        .pulse-dot.info { background: #60a5fa; box-shadow: 0 0 10px #60a5fa; }
        .pulse-dot.warn { background: #f59e0b; box-shadow: 0 0 10px #f59e0b; }
        .pulse-dot.critical { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
        .pulse-content p { margin: 0; }
        .pulse-content small { color: #94a3b8; }
        .severity-chip { font-size: 0.68rem; border-radius: 999px; padding: 0.2rem 0.55rem; border: 1px solid transparent; }
        .severity-chip.info { color: #60a5fa; border-color: rgba(96, 165, 250, 0.4); background: rgba(96, 165, 250, 0.12); }
        .severity-chip.warn { color: #f59e0b; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.12); }
        .severity-chip.critical { color: #ef4444; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.12); }
        .activity-section { margin-top: 2rem; }
        .activity-feed { display: flex; flex-direction: column; gap: 0.75rem; }
        .activity-item { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.85rem 1rem; border-radius: 12px; background: rgba(255, 255, 255, 0.03); }
        .activity-main p { margin: 0.2rem 0 0; color: #94a3b8; }
        .exec-sidebar { display: flex; flex-direction: column; gap: 2rem; }
        .sidebar-group h3 { font-size: 0.9rem; color: #64748b; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; }
        .exec-action-btn { width: 100%; display: flex; align-items: center; gap: 1rem; padding: 1.2rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; color: #fff; font-weight: 600; cursor: pointer; margin-bottom: 0.8rem; transition: all 0.2s; }
        .exec-action-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.1); }
        .exec-action-btn.alert { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.1); }
        .exec-action-btn.alert:hover { background: #ef4444; color: #fff; }
        .mode-toggle-btn { width: 100%; padding: 1rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); background: transparent; color: #64748b; font-weight: 600; cursor: pointer; margin-bottom: 0.5rem; }
        .mode-toggle-btn.active { background: #fff; color: #0f172a; border-color: #fff; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
        .modal-content { max-width: 520px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .modal-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.2rem; }
        .modal-header h2 { font-size: 1.4rem; font-weight: 700; margin: 0; }
        .field-label { display: block; margin-bottom: 0.4rem; color: #94a3b8; font-size: 0.84rem; text-transform: uppercase; letter-spacing: 0.08em; }
        .broadcast-input { width: 100%; margin-bottom: 0.9rem; background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 0.7rem 0.8rem; }
        .broadcast-input option { background: #0f172a; }
        .broadcast-metadata { display: flex; justify-content: space-between; align-items: center; color: #cbd5e1; font-size: 0.9rem; margin-top: 0.25rem; }
        .cooldown.active { color: #f59e0b; font-weight: 700; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.6rem; }
        .btn-secondary { background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.75rem 1.3rem; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .btn-danger { background: #ef4444; color: #fff; border: none; padding: 0.75rem 1.3rem; border-radius: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
        .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
        .icon-warning { font-size: 2rem; color: #ef4444; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
        @media (max-width: 1024px) {
          .exec-grid { grid-template-columns: 1fr; gap: 1.5rem; }
          .kpi-row { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .exec-dashboard { padding: 1rem; }
          .exec-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; margin-bottom: 2rem; }
          .exec-title h1 { font-size: 2rem; }
          .system-heartbeat { width: 100%; padding: 0.8rem 1.2rem; border-radius: 16px; }
          .kpi-row { grid-template-columns: 1fr; }
          .kpi-card { padding: 1.5rem; }
          .section-header { flex-direction: column; align-items: flex-start; }
          .pulse-item { grid-template-columns: 12px 1fr; }
          .severity-chip { justify-self: flex-start; }
          .broadcast-metadata { flex-direction: column; align-items: flex-start; gap: 0.35rem; }
        }
      `}</style>
    </div>
  );
};

export default ExecutiveDashboard;
