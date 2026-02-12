import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../api/client";
import { hasMinLength, isDateRangeValid } from "../utils/validation";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  parseISO,
  isWithinInterval,
} from "date-fns";

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

const CHANGE_TEMPLATES = [
  {
    id: "security-patch",
    name: "Security Patch",
    change_type: "standard",
    risk_assessment: "medium",
    implementation_plan:
      "1. Review patch release notes\n2. Test in staging environment\n3. Schedule maintenance window\n4. Apply patch\n5. Verify services",
    rollback_plan:
      "1. Revert patch via package manager\n2. Restart affected services\n3. Verify rollback success",
    affected_systems: "",
  },
  {
    id: "server-upgrade",
    name: "Server Upgrade",
    change_type: "normal",
    risk_assessment: "high",
    implementation_plan:
      "1. Backup current configuration and data\n2. Schedule downtime window\n3. Perform upgrade\n4. Run post-upgrade validation\n5. Restore services",
    rollback_plan:
      "1. Restore from backup\n2. Revert to previous version\n3. Re-run validation tests",
    affected_systems: "",
  },
  {
    id: "config-change",
    name: "Config Change",
    change_type: "standard",
    risk_assessment: "low",
    implementation_plan:
      "1. Document current config\n2. Apply configuration change\n3. Verify application of change\n4. Monitor for issues",
    rollback_plan:
      "1. Restore previous configuration from backup\n2. Restart affected service if needed",
    affected_systems: "",
  },
];

const ChangeManagementPage = ({ user }) => {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [approversByChange, setApproversByChange] = useState({});
  const [approvalComments, setApprovalComments] = useState({});
  const [expandedChangeId, setExpandedChangeId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [conflicts, setConflicts] = useState([]);
  const [confirmSubmitWithConflict, setConfirmSubmitWithConflict] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarChanges, setCalendarChanges] = useState([]);
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
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await apiClient.get("/changes", { params });
      setChanges(res.data.data.changes || []);
      if (canManage) {
        const approvals = await Promise.all(
          (res.data.data.changes || []).map(async (change) => {
            try {
              const approversRes = await apiClient.get(
                `/changes/${change.change_id}/approvers`,
              );
              return [change.change_id, approversRes.data.data.approvers || []];
            } catch (err) {
              return [change.change_id, []];
            }
          }),
        );
        setApproversByChange(Object.fromEntries(approvals));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load changes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const loadCalendarChanges = useCallback(async () => {
    try {
      const from = startOfMonth(calendarMonth).toISOString();
      const to = endOfMonth(calendarMonth).toISOString();
      const res = await apiClient.get("/changes/calendar/upcoming", {
        params: { from, to },
      });
      setCalendarChanges(res.data.data.changes || []);
    } catch (err) {
      setCalendarChanges([]);
    }
  }, [calendarMonth]);

  useEffect(() => {
    loadCalendarChanges();
  }, [loadCalendarChanges]);

  useEffect(() => {
    if (
      !form.change_window_start ||
      !form.change_window_end ||
      !form.affected_systems?.trim()
    ) {
      setConflicts([]);
      setConfirmSubmitWithConflict(false);
      return;
    }
    if (!isDateRangeValid(form.change_window_start, form.change_window_end)) {
      setConflicts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get("/changes/check-conflicts", {
          params: {
            from: form.change_window_start,
            to: form.change_window_end,
            affected_systems: form.affected_systems,
          },
        });
        setConflicts(res.data.data.conflicts || []);
        setConfirmSubmitWithConflict(false);
      } catch (err) {
        setConflicts([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [
    form.change_window_start,
    form.change_window_end,
    form.affected_systems,
  ]);

  const applyTemplate = (templateId) => {
    const template = CHANGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    setForm((prev) => ({
      ...prev,
      change_type: template.change_type,
      risk_assessment: template.risk_assessment,
      implementation_plan: template.implementation_plan,
      rollback_plan: template.rollback_plan,
      affected_systems: template.affected_systems || prev.affected_systems,
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!hasMinLength(form.title, 5)) {
      setError("Title must be at least 5 characters.");
      return;
    }
    if (!hasMinLength(form.description, 10)) {
      setError("Description must be at least 10 characters.");
      return;
    }
    if (!isDateRangeValid(form.change_window_start, form.change_window_end)) {
      setError("Change window end must be after start.");
      return;
    }
    if (conflicts.length > 0 && !confirmSubmitWithConflict) {
      setError(
        "Scheduling conflict detected. Review overlapping changes below and confirm to submit anyway."
      );
      return;
    }
    if (form.change_type === "emergency") {
      if (!hasMinLength(form.rollback_plan, 10)) {
        setError("Emergency changes require a rollback plan (min 10 chars).");
        return;
      }
      if (!["high", "critical"].includes(form.risk_assessment)) {
        setError("Emergency changes require high or critical risk assessment.");
        return;
      }
    }
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
      setSelectedTemplate("");
      setConflicts([]);
      setConfirmSubmitWithConflict(false);
      load();
      loadCalendarChanges();
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
      await apiClient.post(`/changes/${changeId}/approve`, {
        status,
        comment: approvalComments[changeId] || "",
      });
      setApprovalComments((prev) => ({ ...prev, [changeId]: "" }));
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
            <span>Use Template (optional)</span>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTemplate(val);
                applyTemplate(val);
              }}
            >
              <option value="">— Select a template —</option>
              {CHANGE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
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
          {conflicts.length > 0 && (
            <div className="field full change-conflicts">
              <div className="panel error conflict-warning">
                <strong>Scheduling conflict</strong>
                <p>
                  The following changes overlap with your window and affect the
                  same systems:
                </p>
                <ul>
                  {conflicts.map((c) => (
                    <li key={c.change_id}>
                      {c.change_number}: {c.title}
                      {c.change_window_start &&
                        ` (${format(parseISO(c.change_window_start), "MMM d, HH:mm")} – ${c.change_window_end ? format(parseISO(c.change_window_end), "MMM d, HH:mm") : "TBD"})`}
                    </li>
                  ))}
                </ul>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={confirmSubmitWithConflict}
                    onChange={(e) =>
                      setConfirmSubmitWithConflict(e.target.checked)
                    }
                  />
                  I acknowledge the conflict and want to submit anyway
                </label>
              </div>
            </div>
          )}
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
          {canManage && (
            <div className="change-filter">
              <label>
                <span className="sr-only">Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="change-status-select"
                  title="Filter changes by status"
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
        <div className="user-table">
          {changes.length === 0 && (
            <div className="empty-state">No change requests yet.</div>
          )}
          {changes.map((change) => (
            <div key={change.change_id} className="change-row">
              <div
                className={`user-row change-row-header ${expandedChangeId === change.change_id ? "expanded" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => setExpandedChangeId(
                  expandedChangeId === change.change_id ? null : change.change_id
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedChangeId(
                      expandedChangeId === change.change_id ? null : change.change_id
                    );
                  }
                }}
                aria-expanded={expandedChangeId === change.change_id}
                aria-label="Click to view details"
              >
                <div>
                  <strong>{change.title}</strong>
                  <p>
                    {change.change_number} · {change.change_type} ·{" "}
                    {change.risk_assessment}
                  </p>
                  {approversByChange[change.change_id]?.length > 0 && (
                    <p className="muted">
                      Approvals:{" "}
                      {approversByChange[change.change_id]
                        .map(
                          (approver) =>
                            `${approver.full_name || approver.user_id} (${approver.approval_status})`,
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>
                <div className="user-actions" onClick={(e) => e.stopPropagation()}>
                  {canManage && change.status === "submitted" && (
                    <>
                      <input
                        value={approvalComments[change.change_id] || ""}
                        onChange={(e) =>
                          setApprovalComments((prev) => ({
                            ...prev,
                            [change.change_id]: e.target.value,
                          }))
                        }
                        placeholder="Approval comment (optional)"
                      />
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
                  {canManage && change.status !== "rejected" ? (
                    <label className="change-status-label">
                      <span className="muted">Status:</span>
                      <select
                        value={change.status}
                        onChange={(e) =>
                          handleStatusUpdate(change.change_id, e.target.value)
                        }
                        className="change-status-select"
                        title="Click to change status — advance workflow (scheduled → implemented → closed)"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span className={`badge badge-${change.status}`}>
                      {change.status}
                    </span>
                  )}
                </div>
              </div>
              {expandedChangeId === change.change_id && (
                <div className="change-details">
                  <div className="change-detail-section">
                    <h4>Description</h4>
                    <p>{change.description || "—"}</p>
                  </div>
                  {change.affected_systems && (
                    <div className="change-detail-section">
                      <h4>Affected Systems</h4>
                      <p>{change.affected_systems}</p>
                    </div>
                  )}
                  {change.implementation_plan && (
                    <div className="change-detail-section">
                      <h4>Implementation Plan</h4>
                      <p>{change.implementation_plan}</p>
                    </div>
                  )}
                  {change.rollback_plan && (
                    <div className="change-detail-section">
                      <h4>Rollback Plan</h4>
                      <p>{change.rollback_plan}</p>
                    </div>
                  )}
                  {change.change_window_start && (
                    <div className="change-detail-section">
                      <h4>Change Window</h4>
                      <p>
                        {new Date(change.change_window_start).toLocaleString()} –{" "}
                        {change.change_window_end
                          ? new Date(change.change_window_end).toLocaleString()
                          : "TBD"}
                      </p>
                    </div>
                  )}
                </div>
              )}
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
          <div className="calendar-nav">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              aria-label="Previous month"
            >
              ←
            </button>
            <span className="calendar-month-label">
              {format(calendarMonth, "MMMM yyyy")}
            </span>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              aria-label="Next month"
            >
              →
            </button>
          </div>
        </div>
        <div className="calendar-wrapper">
        <div className="change-calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
          {(() => {
            const monthStart = startOfMonth(calendarMonth);
            const monthEnd = endOfMonth(calendarMonth);
            const start = startOfWeek(monthStart);
            const end = endOfWeek(monthEnd);
            const days = [];
            let day = start;
            while (day <= end) {
              days.push(day);
              day = addDays(day, 1);
            }
            const getChangesForDay = (d) =>
              calendarChanges.filter((c) => {
                if (!c.change_window_start || !c.change_window_end) return false;
                const startDate = parseISO(c.change_window_start);
                const endDate = parseISO(c.change_window_end);
                return isWithinInterval(d, {
                  start: startDate,
                  end: endDate,
                });
              });
            return days.map((d) => {
              const dayChanges = getChangesForDay(d);
              const isCurrentMonth = isSameMonth(d, calendarMonth);
              return (
                <div
                  key={d.toISOString()}
                  className={`calendar-day ${!isCurrentMonth ? "other-month" : ""}`}
                >
                  <span className="calendar-day-num">{format(d, "d")}</span>
                  <div className="calendar-day-events">
                    {dayChanges.slice(0, 3).map((c) => (
                      <div
                        key={c.change_id}
                        className="calendar-event"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setExpandedChangeId(
                            expandedChangeId === c.change_id ? null : c.change_id
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedChangeId(
                              expandedChangeId === c.change_id ? null : c.change_id
                            );
                          }
                        }}
                      title={`${c.change_number}: ${c.title}`}
                      >
                        {c.change_number}: {c.title}
                      </div>
                    ))}
                    {dayChanges.length > 3 && (
                      <div className="calendar-event-more">
                        +{dayChanges.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
        </div>
        {expandedChangeId && (
          <div className="calendar-expanded-change">
            {(() => {
              const change = calendarChanges.find(
                (c) => c.change_id === expandedChangeId
              );
              if (!change) return null;
              return (
                <div className="change-details">
                  <h4>{change.title}</h4>
                  <p className="muted">{change.change_number}</p>
                  {change.change_window_start && (
                    <p>
                      {format(parseISO(change.change_window_start), "PPpp")} –{" "}
                      {change.change_window_end
                        ? format(parseISO(change.change_window_end), "PPpp")
                        : "TBD"}
                    </p>
                  )}
                  {change.description && <p>{change.description}</p>}
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setExpandedChangeId(null)}
                  >
                    Close
                  </button>
                </div>
              );
            })()}
          </div>
        )}
        {calendarChanges.length === 0 && (
          <div className="empty-state">No scheduled changes for this month.</div>
        )}
      </div>
    </div>
  );
};

export default ChangeManagementPage;
