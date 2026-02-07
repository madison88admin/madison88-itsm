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
  const [error, setError] = useState("");

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

  return (
    <div className="dashboard-stack">
      {error && <div className="panel error">{error}</div>}
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
    </div>
  );
};

export default AdvancedReportingPage;
