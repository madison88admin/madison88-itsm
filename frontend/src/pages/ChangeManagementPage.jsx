import React, { useEffect, useState } from "react";
import apiClient from "../api/client";

const changeTypes = ["standard", "normal", "emergency"];
const riskLevels = ["low", "medium", "high", "critical"];
const statusOptions = [
  "new",
  "submitted",
  "approved",
  "scheduled",
  "implemented",
  "closed",
  "rejected",
];

const ChangeManagementPage = ({ user }) => {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    change_type: "normal",
    affected_systems: "",
    implementation_plan: "",
    rollback_plan: "",
    risk_assessment: "medium",
    change_window_start: "",
    change_window_end: "",
  });

  const isManager = user?.role === "it_manager";
  const isAdmin = user?.role === "system_admin";
  const canManage = isManager || isAdmin;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/changes");
      setChanges(res.data.data.changes || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load changes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiClient.post("/changes", {
        ...form,
        change_window_start: form.change_window_start || null,
        change_window_end: form.change_window_end || null,
      });
      setMessage("Change request submitted.");
      setForm({
        title: "",
        description: "",
        change_type: "normal",
        affected_systems: "",
        implementation_plan: "",
        rollback_plan: "",
        risk_assessment: "medium",
        change_window_start: "",
        change_window_end: "",
      });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create change");
    }
  };

  const handleStatusUpdate = async (changeId, status) => {
    setError("");
    try {
      await apiClient.patch(`/changes/${changeId}`, { status });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update change");
    }
  };

  const handleApprove = async (changeId, status) => {
    setError("");
    try {
      await apiClient.post(`/changes/${changeId}/approve`, { status });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update approval");
    }
  };

  if (loading) {
    return <div className="panel">Loading change requests...</div>;
  }

  return (
    <div className="dashboard-stack">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Change Management</h2>
            <p>Log planned changes and track approvals.</p>
            <p className="muted">
              Emergency changes require a rollback plan and a high risk
              assessment.
            </p>
          </div>
        </div>
        {message && <div className="panel success">{message}</div>}
        {error && <div className="panel error">{error}</div>}
        <form className="form-grid" onSubmit={handleCreate}>
          <label className="field full">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Example: Patch VPN gateway"
            />
          </label>
          <label className="field full">
            <span>Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Describe the change scope and expected impact."
            />
          </label>
          <label className="field">
            <span>Change Type</span>
            <select
              value={form.change_type}
              onChange={(e) =>
                setForm({ ...form, change_type: e.target.value })
              }
            >
              {changeTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Risk Assessment</span>
            <select
              value={form.risk_assessment}
              onChange={(e) =>
                setForm({ ...form, risk_assessment: e.target.value })
              }
            >
              {riskLevels.map((risk) => (
                <option key={risk} value={risk}>
                  {risk}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Change Window Start</span>
            <input
              type="datetime-local"
              value={form.change_window_start}
              onChange={(e) =>
                setForm({ ...form, change_window_start: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Change Window End</span>
            <input
              type="datetime-local"
              value={form.change_window_end}
              onChange={(e) =>
                setForm({ ...form, change_window_end: e.target.value })
              }
            />
          </label>
          <label className="field full">
            <span>Affected Systems</span>
            <input
              value={form.affected_systems}
              onChange={(e) =>
                setForm({ ...form, affected_systems: e.target.value })
              }
              placeholder="Example: VPN gateway, Firewall cluster"
            />
          </label>
          <label className="field full">
            <span>Implementation Plan</span>
            <textarea
              rows={3}
              value={form.implementation_plan}
              onChange={(e) =>
                setForm({ ...form, implementation_plan: e.target.value })
              }
              placeholder="Step-by-step implementation plan."
            />
          </label>
          <label className="field full">
            <span>Rollback Plan</span>
            <textarea
              rows={3}
              value={form.rollback_plan}
              onChange={(e) =>
                setForm({ ...form, rollback_plan: e.target.value })
              }
              placeholder="Rollback steps if the change fails."
            />
          </label>
          <div className="field full">
            <button className="btn primary" type="submit">
              Submit Change
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Change Requests</h2>
            <p>Review submitted changes and manage approvals.</p>
          </div>
        </div>
        <div className="user-table">
          {changes.length === 0 && (
            <div className="empty-state">No change requests yet.</div>
          )}
          {changes.map((change) => (
            <div key={change.change_id} className="user-row">
              <div>
                <strong>{change.title}</strong>
                <p>
                  {change.change_number} · {change.change_type} ·{" "}
                  {change.risk_assessment}
                </p>
              </div>
              <div className="user-actions">
                <span className="badge">{change.status}</span>
                {canManage && change.status === "submitted" && (
                  <>
                    <button
                      className="btn ghost"
                      onClick={() =>
                        handleApprove(change.change_id, "approved")
                      }
                    >
                      Approve
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() =>
                        handleApprove(change.change_id, "rejected")
                      }
                    >
                      Reject
                    </button>
                  </>
                )}
                {canManage && change.status !== "rejected" && (
                  <select
                    value={change.status}
                    onChange={(e) =>
                      handleStatusUpdate(change.change_id, e.target.value)
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Change Calendar</h2>
            <p>Scheduled change windows for upcoming work.</p>
          </div>
        </div>
        <div className="user-table">
          {changes.filter((c) => c.status === "scheduled").length === 0 && (
            <div className="empty-state">No scheduled changes.</div>
          )}
          {changes
            .filter((change) => change.status === "scheduled")
            .map((change) => (
              <div key={change.change_id} className="user-row">
                <div>
                  <strong>{change.title}</strong>
                  <p>
                    {change.change_window_start
                      ? new Date(change.change_window_start).toLocaleString()
                      : "TBD"}{" "}
                    ·{" "}
                    {change.change_window_end
                      ? new Date(change.change_window_end).toLocaleString()
                      : "TBD"}
                  </p>
                </div>
                <div className="user-actions">
                  <span className="badge">{change.change_number}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ChangeManagementPage;
