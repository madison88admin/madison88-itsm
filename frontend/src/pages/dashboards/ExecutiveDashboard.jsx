import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import { onDashboardRefresh } from "../../api/socket";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiDatabase,
  FiFileText,
  FiMessageSquare,
  FiZap
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
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

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

const ExecutiveDashboard = ({ loadDetailView }) => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    summary: { open: 0, resolved: 0, compliance: 0 },
    health: { status: 'optimal', text: 'All systems operational' },
    recentEvents: [],
    trends: { labels: [], datasets: [] }
  });
  const [loading, setLoading] = useState(true);
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  const fetchData = async () => {
    try {
      const [statusRes, reportingRes, pulseRes] = await Promise.all([
        apiClient.get("/dashboard/status-summary"),
        apiClient.get("/dashboard/advanced-reporting"),
        apiClient.get("/dashboard/pulse")
      ]);

      const status = statusRes.data.data.summary || {};
      const advanced = reportingRes.data.data || {};
      const pulse = pulseRes.data.data || {};

      // Process Trend Data
      const trendData = advanced.trends?.tickets_by_day || [];
      const labels = trendData.map(d => new Date(d.day).toLocaleDateString('en-US', { weekday: 'short' }));
      const counts = trendData.map(d => parseInt(d.count));

      setData({
        summary: {
          open: status.open || 0,
          resolved: (status.resolved || 0) + (status.closed || 0),
          compliance: advanced.trends?.sla_compliance_by_week?.[0]?.compliance || 100
        },
        health: pulse.systemHealth || { status: 'optimal', text: 'Systems Operational' },
        recentEvents: pulse.events?.slice(0, 5) || [],
        trends: {
          labels,
          datasets: [
            {
              label: 'Daily Ticket Volume',
              data: counts,
              fill: true,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: '#3b82f6',
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#3b82f6',
            }
          ]
        }
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#94a3b8',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { size: 10 }, stepSize: 5 }
      }
    }
  };

  const handleKpiClick = (filter) => {
    const params = new URLSearchParams(filter);
    navigate(`/tickets?${params.toString()}`);
  };

  const handleExport = () => {
    const token = localStorage.getItem('token');
    const url = `${process.env.REACT_APP_API_URL || ''}/api/dashboard/export?format=csv&token=${token}`;
    window.open(url, '_blank');
  };

  const handleBroadcast = async () => {
    const message = window.prompt("Enter the broadcast message for all agents:");
    if (!message) return;
    try {
      await apiClient.post('/dashboard/broadcast', { message });
      window.alert('Broadcast sent successfully!');
    } catch (err) {
      window.alert('Failed to send broadcast');
    }
  };

  const handleBulkEscalate = async () => {
    try {
      const res = await apiClient.post('/dashboard/bulk-escalate-p1');
      window.alert(res.data.message);
      fetchData();
    } catch (err) {
      window.alert('Failed to escalate tickets');
    } finally {
      setShowEscalateModal(false);
    }
  };

  return (
    <div className="exec-dashboard animate-fadeIn">
      {/* Header / System Heartbeat */}
      <header className="exec-header">
        <div className="exec-title">
          <h1>Command Center</h1>
          <p>Global System Oversight</p>
        </div>

        <div className={`system-heartbeat ${loading ? 'loading' : data.health.status}`}>
          <div className="heartbeat-pulse"></div>
          <div className="heartbeat-info">
            <span className="heartbeat-label">System Status</span>
            {loading ? (
              <div className="skeleton-shimmer" style={{ height: '24px', width: '120px', marginTop: '4px', borderRadius: '4px' }} />
            ) : (
              <strong className="heartbeat-text">{data.health.text}</strong>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="exec-grid">
        <div className="exec-main-content">
          {/* KPI Row */}
          <div className="kpi-row">
            <div className="kpi-card hover-lift" onClick={() => handleKpiClick({ status: 'Open' })}>
              <div className="kpi-icon active"><FiActivity /></div>
              <div className="kpi-data">
                <span>Active Issues</span>
                {loading ? (
                  <div className="skeleton-shimmer" style={{ height: '32px', width: '60px', marginTop: '8px', borderRadius: '8px' }} />
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
                  <div className="skeleton-shimmer" style={{ height: '32px', width: '80px', marginTop: '8px', borderRadius: '8px' }} />
                ) : (
                  <strong>{Math.round(data.summary.compliance)}%</strong>
                )}
              </div>
            </div>

            <div className="kpi-card hover-lift" onClick={() => handleKpiClick({ status: 'Resolved' })}>
              <div className="kpi-icon resolved"><FiCheckCircle /></div>
              <div className="kpi-data">
                <span>Resolved Today</span>
                {loading ? (
                  <div className="skeleton-shimmer" style={{ height: '32px', width: '60px', marginTop: '8px', borderRadius: '8px' }} />
                ) : (
                  <strong>{data.summary.resolved}</strong>
                )}
              </div>
            </div>
          </div>

          {/* Performance Trend */}
          <section className="trend-section glass-panel">
            <div className="section-header">
              <h3>Performance Trend</h3>
              <span className="muted">Last 7 Days</span>
            </div>
            <div className="chart-container" style={{ height: '200px', position: 'relative' }}>
              {data.trends.labels.length > 0 ? (
                <Line data={data.trends} options={chartOptions} />
              ) : (
                <div className="skeleton-shimmer" style={{ height: '100%', borderRadius: '12px' }} />
              )}
            </div>
          </section>

          {/* Activity Pulse */}
          <section className="pulse-section glass-panel">
            <div className="section-header">
              <h3>Live Activity Pulse</h3>
              <FiDatabase className="muted" />
            </div>
            <div className="pulse-list">
              {data.recentEvents.map((event, idx) => (
                <div key={idx} className="pulse-item cascade-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className={`pulse-dot ${event.type}`}></div>
                  <div className="pulse-content">
                    <p>{event.text}</p>
                    <small>{new Date(event.timestamp).toLocaleTimeString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Actions */}
        <aside className="exec-sidebar">
          <div className="sidebar-group glass-panel">
            <h3>Executive Actions</h3>
            <button className="exec-action-btn hover-lift" onClick={handleExport}>
              <FiFileText /> Generate Summary Report
            </button>
            <button className="exec-action-btn hover-lift" onClick={handleBroadcast}>
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

      {/* Confirmation Modal */}
      {showEscalateModal && (
        <div className="modal-overlay animate-fadeIn">
          <div className="modal-content glass-panel animate-slideUp">
            <div className="modal-header">
              <FiAlertCircle className="icon-warning" />
              <h2>Priority Escalation</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to escalate all P1 tickets? If yes, then it's gonna escalate; if no, then wag.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEscalateModal(false)}>No</button>
              <button className="btn-danger" onClick={handleBulkEscalate}>Yes, Escalate Now</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .exec-dashboard {
          padding: 2rem;
          color: #fff;
          max-width: 1600px;
          margin: 0 auto;
        }
        .exec-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
        }
        .exec-title h1 {
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(to right, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .exec-title p { color: #64748b; font-size: 1.2rem; }

        .system-heartbeat {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: rgba(15, 23, 42, 0.4);
          padding: 1rem 2rem;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .heartbeat-pulse {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          position: relative;
        }
        .system-heartbeat.optimal .heartbeat-pulse { background: #10b981; box-shadow: 0 0 20px #10b981; }
        .system-heartbeat.critical .heartbeat-pulse { background: #ef4444; box-shadow: 0 0 20px #ef4444; }
        
        .heartbeat-pulse::after {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .system-heartbeat.optimal .heartbeat-pulse::after { background: #10b981; }
        .system-heartbeat.critical .heartbeat-pulse::after { background: #ef4444; }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }

        .exec-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }

        .kpi-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .kpi-card {
          background: rgba(30, 41, 59, 0.4);
          padding: 2.5rem 2rem;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          gap: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .kpi-card:hover {
          background: rgba(30, 41, 59, 0.6);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-4px);
        }
        .kpi-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
        }
        .kpi-icon.active { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .kpi-icon.compliance { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .kpi-icon.resolved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        
        .kpi-data span { color: #64748b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; }
        .kpi-data strong { display: block; font-size: 2.5rem; font-weight: 800; margin-top: 0.2rem; }

        .glass-panel {
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .section-header h3 { font-size: 1.5rem; font-weight: 700; }

        .trend-section { margin-bottom: 2rem; }

        .pulse-list { display: flex; flex-direction: column; gap: 1rem; }
        .pulse-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.2rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
        }
        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; }
        .pulse-dot.resolution { background: #10b981; box-shadow: 0 0 10px #10b981; }
        .pulse-dot.kb { background: #8b5cf6; box-shadow: 0 0 10px #8b5cf6; }
        .pulse-dot.metric { background: #3b82f6; box-shadow: 0 0 10px #3b82f6; }

        .exec-sidebar { display: flex; flex-direction: column; gap: 2rem; }
        .sidebar-group h3 { font-size: 0.9rem; color: #64748b; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; }
        
        .exec-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 0.8rem;
          transition: all 0.2s;
        }
        .exec-action-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.1); }
        .exec-action-btn.alert { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.1); }
        .exec-action-btn.alert:hover { background: #ef4444; color: #fff; }

        .mode-toggle-btn {
          width: 100%;
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: transparent;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 0.5rem;
        }
        .mode-toggle-btn.active {
          background: #fff;
          color: #0f172a;
          border-color: #fff;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .modal-content {
          max-width: 450px;
          width: 100%;
          border: 1px solid rgba(239, 68, 68, 0.2);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .modal-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .modal-header h2 { font-size: 1.5rem; font-weight: 700; margin: 0; }
        .icon-warning { font-size: 2rem; color: #ef4444; }
        .modal-body p { color: #94a3b8; line-height: 1.6; font-size: 1.1rem; }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-danger {
          background: #ef4444;
          color: #fff;
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }
        .btn-danger:hover { background: #dc2626; transform: translateY(-2px); }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }

        /* Responsive Executive Dashboard */
        @media (max-width: 1024px) {
          .exec-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .exec-sidebar {
            order: 2;
          }
          .kpi-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .exec-dashboard {
            padding: 1rem;
          }
          .exec-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
            margin-bottom: 2rem;
          }
          .exec-title h1 {
            font-size: 2rem;
          }
          .system-heartbeat {
            width: 100%;
            padding: 0.8rem 1.5rem;
          }
          .kpi-row {
            grid-template-columns: 1fr;
          }
          .kpi-card {
            padding: 1.5rem;
          }
          .section-header h3 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ExecutiveDashboard;
