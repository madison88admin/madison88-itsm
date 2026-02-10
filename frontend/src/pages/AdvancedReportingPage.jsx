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
import { hasMaxLength, isDateRangeValid } from "../utils/validation";

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
  const [summary, setSummary] = useState({
    mttr_hours: 0,
    mtta_hours: 0,
    reopen_rate: 0,
    avg_reopen_count: 0,
  });
  const [trends, setTrends] = useState({
    tickets_by_day: [],
    sla_breaches_by_day: [],
  });
  const [agents, setAgents] = useState([]);
  const [agentWorkload, setAgentWorkload] = useState([]);
  const [agentStatusMatrix, setAgentStatusMatrix] = useState([]);
  const [approvals, setApprovals] = useState({
    change_requests: 0,
    priority_overrides: 0,
  });
  const [escalationsOpen, setEscalationsOpen] = useState(0);
  const [topTags, setTopTags] = useState([]);
  const [slaByPriority, setSlaByPriority] = useState([]);
  const [slaByTeam, setSlaByTeam] = useState([]);
  const [slaWeekly, setSlaWeekly] = useState([]);
  const [agingBuckets, setAgingBuckets] = useState({
    bucket_0_1: 0,
    bucket_2_3: 0,
    bucket_4_7: 0,
    bucket_8_14: 0,
    bucket_15_plus: 0,
  });
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

  const priorityComplianceData = useMemo(() => {
    return {
      labels: slaByPriority.map((row) => row.priority),
      datasets: [
        {
          label: "Compliance %",
          data: slaByPriority.map((row) => row.compliance || 0),
          backgroundColor: "rgba(47, 215, 255, 0.4)",
        },
      ],
    };
  }, [slaByPriority]);

  const teamComplianceData = useMemo(() => {
    return {
      labels: slaByTeam.map((row) => row.team_name || "Unassigned"),
      datasets: [
        {
          label: "Compliance %",
          data: slaByTeam.map((row) => row.compliance || 0),
          backgroundColor: "rgba(43, 107, 255, 0.4)",
        },
      ],
    };
  }, [slaByTeam]);

  const slaWeeklyData = useMemo(() => {
    const rows = [...slaWeekly].reverse();
    return {
      labels: rows.map((row) => row.week_start),
      datasets: [
        {
          label: "Compliance %",
          data: rows.map((row) => row.compliance || 0),
          borderColor: "#37d996",
          backgroundColor: "rgba(55, 217, 150, 0.2)",
          tension: 0.3,
        },
      ],
    };
  }, [slaWeekly]);

  const workloadData = useMemo(() => {
    return {
      labels: agentWorkload.map((row) => row.full_name || "Agent"),
      datasets: [
        {
          label: "Assigned",
          data: agentWorkload.map((row) => row.assigned_total || 0),
          backgroundColor: "rgba(47, 215, 255, 0.35)",
        },
        {
          label: "Active",
          data: agentWorkload.map((row) => row.active_count || 0),
          backgroundColor: "rgba(255, 181, 71, 0.35)",
        },
        {
          label: "Overdue",
          data: agentWorkload.map((row) => row.overdue_count || 0),
          backgroundColor: "rgba(255, 93, 108, 0.35)",
        },
      ],
    };
  }, [agentWorkload]);

  const statusKeys = useMemo(
    () => [
      { key: "new_count", label: "New", color: "47, 215, 255" },
      { key: "in_progress_count", label: "In Progress", color: "43, 107, 255" },
      { key: "pending_count", label: "Pending", color: "255, 181, 71" },
      { key: "resolved_count", label: "Resolved", color: "55, 217, 150" },
      { key: "closed_count", label: "Closed", color: "139, 151, 186" },
      { key: "reopened_count", label: "Reopened", color: "255, 93, 108" },
    ],
    [],
  );

  const maxHeatCount = useMemo(() => {
    let max = 0;
    agentStatusMatrix.forEach((row) => {
      statusKeys.forEach((status) => {
        const value = row[status.key] || 0;
        if (value > max) max = value;
      });
    });
    return max;
  }, [agentStatusMatrix, statusKeys]);

  const compactChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#8b97ba",
            boxWidth: 12,
            boxHeight: 12,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#8b97ba" },
          grid: { color: "rgba(47, 215, 255, 0.08)" },
        },
        y: {
          ticks: { color: "#8b97ba" },
          grid: { color: "rgba(47, 215, 255, 0.08)" },
        },
      },
    }),
    [],
  );

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const res = await apiClient.get("/dashboard/advanced-reporting");
        setSummary(
          res.data.data.summary || {
            mttr_hours: 0,
            mtta_hours: 0,
            reopen_rate: 0,
            avg_reopen_count: 0,
          },
        );
        setTrends(
          res.data.data.trends || {
            tickets_by_day: [],
            sla_breaches_by_day: [],
          },
        );
        setAgents(res.data.data.agent_performance || []);
        setAgentWorkload(res.data.data.agent_workload || []);
        setAgentStatusMatrix(res.data.data.agent_status_matrix || []);
        setApprovals(
          res.data.data.approvals_pending || {
            change_requests: 0,
            priority_overrides: 0,
          },
        );
        setEscalationsOpen(res.data.data.escalations_open || 0);
        setTopTags(res.data.data.top_tags || []);
        setSlaByPriority(res.data.data.sla_compliance_by_priority || []);
        setSlaByTeam(res.data.data.sla_compliance_by_team || []);
        setSlaWeekly(res.data.data.trends?.sla_compliance_by_week || []);
        setAgingBuckets(
          res.data.data.aging_buckets || {
            bucket_0_1: 0,
            bucket_2_3: 0,
            bucket_4_7: 0,
            bucket_8_14: 0,
            bucket_15_plus: 0,
          },
        );
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
    if (!isDateRangeValid(exportStart, exportEnd)) {
      setError("End date must be after start date.");
      return;
    }
    if (!hasMaxLength(exportAction, 50)) {
      setError("Action type must be 50 characters or less.");
      return;
    }
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
    <div className="dashboard-stack reporting-stack">
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
        <div className="stats-row two-col">
          <div className="stat-chip">
            <span>MTTR (hrs)</span>
            <strong>{summary.mttr_hours?.toFixed(2) || "0.00"}</strong>
          </div>
          <div className="stat-chip">
            <span>MTTA (hrs)</span>
            <strong>{summary.mtta_hours?.toFixed(2) || "0.00"}</strong>
          </div>
          <div className="stat-chip">
            <span>Reopen Rate</span>
            <strong>{summary.reopen_rate?.toFixed(2) || "0.00"}%</strong>
          </div>
          <div className="stat-chip">
            <span>Avg Reopens</span>
            <strong>{summary.avg_reopen_count?.toFixed(2) || "0.00"}</strong>
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
        <h3>Aging Buckets (Open Tickets)</h3>
        <div className="stats-row two-col">
          <div className="stat-chip">
            <span>0-1 days</span>
            <strong>{agingBuckets.bucket_0_1 || 0}</strong>
          </div>
          <div className="stat-chip">
            <span>2-3 days</span>
            <strong>{agingBuckets.bucket_2_3 || 0}</strong>
          </div>
          <div className="stat-chip">
            <span>4-7 days</span>
            <strong>{agingBuckets.bucket_4_7 || 0}</strong>
          </div>
          <div className="stat-chip">
            <span>8-14 days</span>
            <strong>{agingBuckets.bucket_8_14 || 0}</strong>
          </div>
          <div className="stat-chip">
            <span>15+ days</span>
            <strong>{agingBuckets.bucket_15_plus || 0}</strong>
          </div>
        </div>
      </div>

      <div className="reporting-grid">
        <div className="panel">
          <h3>Ticket Volume (Last 30 Days)</h3>
          {trends.tickets_by_day.length === 0 ? (
            <div className="empty-state">No ticket volume data.</div>
          ) : (
            <div className="chart-wrap compact">
              <Line data={ticketVolumeData} options={compactChartOptions} />
            </div>
          )}
        </div>

        <div className="panel">
          <h3>SLA Breaches (Last 30 Days)</h3>
          {trends.sla_breaches_by_day.length === 0 ? (
            <div className="empty-state">No SLA breach data.</div>
          ) : (
            <div className="chart-wrap compact">
              <Line data={slaBreachData} options={compactChartOptions} />
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Top Agent Performance</h3>
          {agents.length === 0 ? (
            <div className="empty-state">No agent performance data.</div>
          ) : (
            <div className="chart-wrap compact">
              <Bar data={agentPerfData} options={compactChartOptions} />
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Top Tags</h3>
          {topTags.length === 0 ? (
            <div className="empty-state">No tag data.</div>
          ) : (
            <div className="chart-wrap compact">
              <Bar data={tagData} options={compactChartOptions} />
            </div>
          )}
        </div>

        <div className="panel">
          <h3>SLA Compliance (Weekly)</h3>
          {slaWeekly.length === 0 ? (
            <div className="empty-state">No SLA trend data.</div>
          ) : (
            <div className="chart-wrap compact">
              <Line data={slaWeeklyData} options={compactChartOptions} />
            </div>
          )}
        </div>

        <div className="panel">
          <h3>SLA Compliance by Priority</h3>
          {slaByPriority.length === 0 ? (
            <div className="empty-state">No SLA priority data.</div>
          ) : (
            <div className="chart-wrap compact">
              <Bar data={priorityComplianceData} options={compactChartOptions} />
            </div>
          )}
        </div>

        <div className="panel">
          <h3>SLA Compliance by Team</h3>
          {slaByTeam.length === 0 ? (
            <div className="empty-state">No SLA team data.</div>
          ) : (
            <div className="chart-wrap compact">
              <Bar data={teamComplianceData} options={compactChartOptions} />
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Agent Workload</h3>
          {agentWorkload.length === 0 ? (
            <div className="empty-state">No workload data.</div>
          ) : (
            <div className="chart-wrap compact">
              <Bar data={workloadData} options={compactChartOptions} />
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Agent Status Heatmap</h3>
          {agentStatusMatrix.length === 0 ? (
            <div className="empty-state">No status data.</div>
          ) : (
            <div className="heatmap">
              <div className="heatmap-row header">
                <span>Agent</span>
                {statusKeys.map((status) => (
                  <span key={status.key}>{status.label}</span>
                ))}
              </div>
              {agentStatusMatrix.map((row) => (
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
        </div>
      </div>
    </div>
  );
};

export default AdvancedReportingPage;
