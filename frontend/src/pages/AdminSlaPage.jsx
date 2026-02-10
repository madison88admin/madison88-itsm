import React, { useEffect, useState } from "react";
import apiClient from "../api/client";

const priorities = ["P1", "P2", "P3", "P4"];

const AdminSlaPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  const normalizeRules = (rows) => {
    const byPriority = new Map(rows.map((row) => [row.priority, row]));
    return priorities.map((priority) => {
      const existing = byPriority.get(priority);
      return {
        priority,
        response_time_hours: existing?.response_time_hours ?? "",
        resolution_time_hours: existing?.resolution_time_hours ?? "",
        escalation_threshold_percent:
          existing?.escalation_threshold_percent ?? 80,
        is_active: existing?.is_active ?? true,
      };
    });
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/sla-rules");
      const rows = res.data.data.rules || [];
      setRules(normalizeRules(rows));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load SLA rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRule = (priority, updates) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.priority === priority ? { ...rule, ...updates } : rule,
      ),
    );
  };

  const saveRule = async (rule) => {
    const responseHours = Number(rule.response_time_hours);
    const resolutionHours = Number(rule.resolution_time_hours);
    const escalationPercent = Number(rule.escalation_threshold_percent);
    if (!responseHours || !resolutionHours) {
      setError("Response and resolution hours are required.");
      return;
    }
    if (responseHours < 1 || resolutionHours < 1) {
      setError("Hours must be 1 or greater.");
      return;
    }
    if (escalationPercent < 1 || escalationPercent > 100) {
      setError("Escalation percent must be between 1 and 100.");
      return;
    }
    setSaving(rule.priority);
    setError("");
    try {
      await apiClient.put(`/sla-rules/${rule.priority}`, {
        response_time_hours: responseHours,
        resolution_time_hours: resolutionHours,
        escalation_threshold_percent: escalationPercent,
        is_active: rule.is_active,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save SLA rule");
    } finally {
      setSaving("");
    }
  };

  if (loading) {
    return <div className="panel">Loading SLA rules...</div>;
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>SLA Standards</h2>
          <p>Configure response and resolution targets by priority.</p>
          <p className="muted">
            Response hrs = time to first reply. Resolution hrs = target fix
            time. Escalation % triggers warnings as the SLA window approaches.
          </p>
        </div>
      </div>
      {error && <div className="inline-error">{error}</div>}
      <div className="sla-table">
        <div className="sla-table-header">
          <span>Priority</span>
          <span>
            Response hrs
            <span className="info-tip" title="Time to first reply.">
              i
            </span>
          </span>
          <span>
            Resolution hrs
            <span
              className="info-tip"
              title="Target time to resolve the ticket."
            >
              i
            </span>
          </span>
          <span>
            Escalation %
            <span
              className="info-tip"
              title="Alert threshold before SLA breach."
            >
              i
            </span>
          </span>
          <span>Active</span>
          <span>Action</span>
        </div>
        {rules.map((rule) => (
          <div key={rule.priority} className="sla-table-row">
            <div className="sla-priority">
              <strong>{rule.priority}</strong>
              <span className="muted">Priority Tier</span>
            </div>
            <input
              type="number"
              min="1"
              value={rule.response_time_hours}
              onChange={(e) =>
                updateRule(rule.priority, {
                  response_time_hours: e.target.value,
                })
              }
              placeholder="Response hrs"
            />
            <input
              type="number"
              min="1"
              value={rule.resolution_time_hours}
              onChange={(e) =>
                updateRule(rule.priority, {
                  resolution_time_hours: e.target.value,
                })
              }
              placeholder="Resolution hrs"
            />
            <input
              type="number"
              min="1"
              max="100"
              value={rule.escalation_threshold_percent}
              onChange={(e) =>
                updateRule(rule.priority, {
                  escalation_threshold_percent: e.target.value,
                })
              }
              placeholder="Escalation %"
            />
            <label className="inline-check">
              <input
                type="checkbox"
                checked={rule.is_active}
                onChange={(e) =>
                  updateRule(rule.priority, { is_active: e.target.checked })
                }
              />
              Active
            </label>
            <button
              className="btn primary"
              onClick={() => saveRule(rule)}
              disabled={saving === rule.priority}
            >
              {saving === rule.priority ? "Saving..." : "Save"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSlaPage;
