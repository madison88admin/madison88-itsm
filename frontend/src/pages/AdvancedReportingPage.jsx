import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import apiClient from "../api/client";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
);

const AdvancedReportingPage = () => {
  const [summary, setSummary] = useState({ mttr_hours: 0, mtta_hours: 0 });
  const [trends, setTrends] = useState({
    tickets_by_day: [],
    sla_breaches_by_day: [],
  });
  const [agents, setAgents] = useState([]);
  const [approvals, setApprovals] = useState({
    change_requests: 0,
    priority_overrides: 0,
  });
  const [escalationsOpen, setEscalationsOpen] = useState(0);
  const [topTags, setTopTags] = useState([]);
  const [error, setError] = useState("");
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [exportAction, setExportAction] = useState("");
  const [exporting, setExporting] = useState(false);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }, []);

  const canExportAudit = ["it_manager", "system_admin"].includes(
    currentUser?.role,
  );

  const ticketVolumeData = useMemo(() => {
    const rows = [...trends.tickets_by_day].reverse();
    return {
      labels: rows.map((row) => row.day),
      datasets: [
        {
          label: "Tickets",
          data: rows.map((row) => row.count),
          borderColor: "#2fd7ff",
          backgroundColor: "rgba(47, 215, 255, 0.2)",
          tension: 0.35,
        },
      ],
    };
  }, [trends.tickets_by_day]);

  const slaBreachData = useMemo(() => {
    const rows = [...trends.sla_breaches_by_day].reverse();
    return {
      labels: rows.map((row) => row.day),
      datasets: [
        {
          label: "SLA Breaches",
          data: rows.map((row) => row.count),
          borderColor: "#ff5d6c",
          backgroundColor: "rgba(255, 93, 108, 0.25)",
          tension: 0.35,
        },
      ],
    };
  }, [trends.sla_breaches_by_day]);

  const agentPerfData = useMemo(() => {
    return {
      labels: agents.map((agent) => agent.full_name || "Agent"),
      datasets: [
        {
          label: "Resolved",
          data: agents.map((agent) => agent.resolved_count || 0),
          backgroundColor: "rgba(43, 107, 255, 0.6)",
        },
      ],
    };
  }, [agents]);

  const tagData = useMemo(() => {
    return {
      labels: topTags.map((tag) => tag.tag),
      datasets: [
        {
          label: "Tickets",
          data: topTags.map((tag) => tag.count),
          backgroundColor: "rgba(45, 196, 142, 0.6)",
        },
      ],
    };
  }, [topTags]);

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const res = await apiClient.get("/dashboard/advanced-reporting");
        setSummary(res.data.data.summary || { mttr_hours: 0, mtta_hours: 0 });
        setTrends(
          res.data.data.trends || {
            tickets_by_day: [],
            sla_breaches_by_day: [],
          },
        );
        setAgents(res.data.data.agent_performance || []);
        setApprovals(
          res.data.data.approvals_pending || {
            change_requests: 0,
            priority_overrides: 0,
          },
        );
        setEscalationsOpen(res.data.data.escalations_open || 0);
        setTopTags(res.data.data.top_tags || []);
      } catch (err) {
        const message =
          err.response?.data?.message || "Failed to load reporting";
        setError(
          message.includes("Route not found")
            ? "Reporting route not found. Restart the backend and try again."
            : message,
        );
      }
    };

    load();
  }, []);

  const handleAuditDownload = async () => {
    setExporting(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("format", exportFormat);
      if (exportStart) params.set("start_date", exportStart);
      if (exportEnd) params.set("end_date", exportEnd);
      if (exportAction.trim()) params.set("action_type", exportAction.trim());

      const res = await apiClient.get(`/audit/export?${params.toString()}`, {
        responseType: "blob",
      });

      const extension =
        exportFormat === "json"
          ? "json"
          : exportFormat === "pdf"
            ? "pdf"
            : "csv";
      const mimeType =
        exportFormat === "json"
          ? "application/json"
          : exportFormat === "pdf"
            ? "application/pdf"
            : "text/csv";
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-export.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download audit log");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="dashboard-stack">
      {error && <div className="panel error">{error}</div>}
      {canExportAudit && (
        <div className="panel">
          <h3>Audit Export</h3>
          <div className="form-grid">
            <label className="field">
              <span>Start Date</span>
              <input
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
              />
            </label>
            <label className="field">
              <span>End Date</span>
              <input
                type="date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Action Type (optional)</span>
              <input
                value={exportAction}
                onChange={(e) => setExportAction(e.target.value)}
                placeholder="updated, created, commented"
              />
            </label>
            <label className="field">
              <span>Format</span>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
                <option value="json">JSON</option>
              </select>
            </label>
            <div className="field">
              <span>&nbsp;</span>
              <button
                className="btn primary"
                onClick={handleAuditDownload}
                disabled={exporting}
              >
                {exporting ? "Downloading..." : "Download Audit Log"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="panel">
        <h3>Service Performance</h3>
        <div className="stats-row">
          <div className="stat-chip">
            <span>MTTR (hrs)</span>
            <strong>{summary.mttr_hours?.toFixed(2) || "0.00"}</strong>
          </div>
          <div className="stat-chip">
            <span>MTTA (hrs)</span>
            <strong>{summary.mtta_hours?.toFixed(2) || "0.00"}</strong>
          </div>
          <div className="stat-chip">
            <span>Pending Approvals</span>
            <strong>
              {approvals.change_requests + approvals.priority_overrides}
            </strong>
          </div>
          <div className="stat-chip">
            <span>SLA Escalations</span>
            <strong>{escalationsOpen}</strong>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Ticket Volume (Last 30 Days)</h3>
        {trends.tickets_by_day.length === 0 ? (
          <div className="empty-state">No ticket volume data.</div>
        ) : (
          <div className="chart-wrap">
            <Line data={ticketVolumeData} />
          </div>
        )}
      </div>

      <div className="panel">
        <h3>SLA Breaches (Last 30 Days)</h3>
        {trends.sla_breaches_by_day.length === 0 ? (
          <div className="empty-state">No SLA breach data.</div>
        ) : (
          <div className="chart-wrap">
            <Line data={slaBreachData} />
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Top Agent Performance</h3>
        {agents.length === 0 ? (
          <div className="empty-state">No agent performance data.</div>
        ) : (
          <div className="chart-wrap">
            <Bar data={agentPerfData} />
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Top Tags</h3>
        {topTags.length === 0 ? (
          <div className="empty-state">No tag data.</div>
        ) : (
          <div className="chart-wrap">
            <Bar data={tagData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedReportingPage;
