import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, isWithinInterval, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import apiClient from "../api/client";
import { hasMinLength, isDateRangeValid } from "../utils/validation";

const changeTypes = ["standard", "normal", "emergency"];
const riskLevels = ["low", "medium", "high", "critical"];
const statuses = ["new", "submitted", "approved", "scheduled", "implemented", "closed", "rejected"];
const defaultForm = {
  title: "", description: "", change_type: "normal", affected_systems: "", implementation_plan: "", rollback_plan: "",
  risk_assessment: "medium", change_window_start: "", change_window_end: "", business_impact: "", communication_plan: "",
  dependency_map: "", emergency_justification: "",
  role_assignments: { implementer_user_id: "", owner_user_id: "", approver_user_id: "", business_owner: "" },
  technical_checklist: { test_evidence: true, backup_ready: true, rollback_ready: true, monitoring_ready: true, dependency_mapped: true },
};

const templates = [
  { id: "std", name: "Standard Maintenance", change_type: "standard", risk_assessment: "low" },
  { id: "normal", name: "Infrastructure Upgrade", change_type: "normal", risk_assessment: "high" },
  { id: "emg", name: "Emergency Fix", change_type: "emergency", risk_assessment: "critical" },
];

const formatWindow = (start, end) => {
  if (!start) return "TBD";
  try { return `${format(parseISO(start), "PPpp")} to ${end ? format(parseISO(end), "PPpp") : "TBD"}`; } catch { return "TBD"; }
};

const ChangeManagementPage = ({ user }) => {
  const isManage = ["it_manager", "system_admin"].includes(user?.role);
  const [changes, setChanges] = useState([]);
  const [calendarChanges, setCalendarChanges] = useState([]);
  const [users, setUsers] = useState([]);
  const [approversByChange, setApproversByChange] = useState({});
  const [statusFilter, setStatusFilter] = useState("");
  const [approvalComments, setApprovalComments] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [expandedChangeId, setExpandedChangeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [conflicts, setConflicts] = useState([]);
  const [confirmSubmitWithConflict, setConfirmSubmitWithConflict] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/changes", { params: statusFilter ? { status: statusFilter } : {} });
      const list = res.data.data.changes || [];
      setChanges(list);
      if (isManage) {
        const pairs = await Promise.all(list.map(async (c) => {
          try {
            const a = await apiClient.get(`/changes/${c.change_id}/approvers`);
            return [c.change_id, a.data.data.approvers || []];
          } catch { return [c.change_id, []]; }
        }));
        setApproversByChange(Object.fromEntries(pairs));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load changes");
    } finally {
      setLoading(false);
    }
  }, [isManage, statusFilter]);

  const loadCalendar = useCallback(async () => {
    try {
      const res = await apiClient.get("/changes/calendar/upcoming", {
        params: { from: startOfMonth(calendarMonth).toISOString(), to: endOfMonth(calendarMonth).toISOString() },
      });
      setCalendarChanges(res.data.data.changes || []);
    } catch { setCalendarChanges([]); }
  }, [calendarMonth]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCalendar(); }, [loadCalendar]);
  useEffect(() => {
    if (!isManage) return;
    (async () => {
      try {
        const [agents, managers, admins] = await Promise.all([
          apiClient.get("/users", { params: { role: "it_agent" } }),
          apiClient.get("/users", { params: { role: "it_manager" } }),
          apiClient.get("/users", { params: { role: "system_admin" } }),
        ]);
        const all = [...(agents.data.data.users || []), ...(managers.data.data.users || []), ...(admins.data.data.users || [])];
        const dedupe = Object.values(all.reduce((acc, item) => { acc[item.user_id] = item; return acc; }, {}));
        setUsers(dedupe);
      } catch { setUsers([]); }
    })();
  }, [isManage]);

  useEffect(() => {
    if (!form.change_window_start || !form.change_window_end || !form.affected_systems.trim() || !isDateRangeValid(form.change_window_start, form.change_window_end)) {
      setConflicts([]); setConfirmSubmitWithConflict(false); return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get("/changes/check-conflicts", { params: { from: form.change_window_start, to: form.change_window_end, affected_systems: form.affected_systems } });
        setConflicts(res.data.data.conflicts || []);
        setConfirmSubmitWithConflict(false);
      } catch { setConflicts([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [form.change_window_start, form.change_window_end, form.affected_systems]);

  const kpis = useMemo(() => ({
    total: changes.length,
    highRisk: changes.filter((c) => ["high", "critical"].includes(c.risk_assessment)).length,
    emergency: changes.filter((c) => c.change_type === "emergency").length,
    pirOpen: changes.filter((c) => c.pir_required && !c.pir_completed).length,
    overdueApproval: changes.filter((c) => c.status === "submitted" && c.approval_due_at && new Date(c.approval_due_at).getTime() < Date.now()).length,
  }), [changes]);

  const applyTemplate = (id) => {
    setSelectedTemplate(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm((p) => ({ ...p, change_type: t.change_type, risk_assessment: t.risk_assessment }));
  };

  const createChange = async (e) => {
    e.preventDefault(); setError(""); setMessage("");
    if (!hasMinLength(form.title, 5) || !hasMinLength(form.description, 10)) return setError("Title/description too short.");
    if (!isDateRangeValid(form.change_window_start, form.change_window_end)) return setError("Invalid change window.");
    if (!hasMinLength(form.business_impact, 10) || !hasMinLength(form.communication_plan, 10)) return setError("Business impact and communication plan are required.");
    if (!form.role_assignments.implementer_user_id || !form.role_assignments.owner_user_id || !hasMinLength(form.role_assignments.business_owner, 2)) return setError("RACI fields are incomplete.");
    if (form.change_type === "emergency" && (!hasMinLength(form.emergency_justification, 10) || !["high", "critical"].includes(form.risk_assessment))) return setError("Emergency changes require justification and high/critical risk.");
    if (conflicts.length > 0 && !confirmSubmitWithConflict) return setError("Acknowledge conflicts before submitting.");
    try {
      await apiClient.post("/changes", { ...form, role_assignments: { ...form.role_assignments, requester_user_id: user?.user_id || null, approver_user_id: form.role_assignments.approver_user_id || null } });
      setMessage("Change request submitted.");
      setForm(defaultForm); setSelectedTemplate(""); setConflicts([]); setConfirmSubmitWithConflict(false);
      load(); loadCalendar();
    } catch (err) { setError(err.response?.data?.message || "Failed to create change"); }
  };

  const approve = async (id, status) => {
    try { await apiClient.post(`/changes/${id}/approve`, { status, comment: approvalComments[id] || "" }); setApprovalComments((p) => ({ ...p, [id]: "" })); load(); }
    catch (err) { setError(err.response?.data?.message || "Approval failed"); }
  };
  const updateStatus = async (id, status) => {
    try { await apiClient.patch(`/changes/${id}`, { status }); load(); }
    catch (err) { setError(err.response?.data?.message || "Status update failed"); }
  };
  const deleteRejectedChange = async (id) => {
    try {
      setError("");
      setMessage("Deleting rejected change request...");
      await apiClient.delete(`/changes/${id}`);
      setMessage("Rejected change request deleted.");
      setPendingDeleteId(null);
      load();
      loadCalendar();
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          await apiClient.post(`/changes/${id}/delete`);
          setMessage("Rejected change request deleted.");
          setPendingDeleteId(null);
          load();
          loadCalendar();
          return;
        } catch (fallbackErr) {
          setError(fallbackErr.response?.data?.message || "Delete failed");
          return;
        }
      }
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  if (loading) return <div className="panel">Loading change requests...</div>;

  return (
    <div className="dashboard-stack">
      <div className="panel change-governance">
        <div className="panel-header"><div><h2>Change Governance Center</h2><p>Manager and system admin controls with audit-ready execution.</p></div></div>
        <div className="change-kpi-grid">
          <div className="change-kpi-card"><span>Total</span><strong>{kpis.total}</strong></div>
          <div className="change-kpi-card"><span>High Risk</span><strong>{kpis.highRisk}</strong></div>
          <div className="change-kpi-card"><span>Emergency</span><strong>{kpis.emergency}</strong></div>
          <div className="change-kpi-card"><span>PIR Open</span><strong>{kpis.pirOpen}</strong></div>
          <div className="change-kpi-card"><span>Approval SLA Breach</span><strong>{kpis.overdueApproval}</strong></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Create Change</h2><p>Includes RACI, business impact, communication plan, technical gates, and conflict checks.</p></div></div>
        {message && <div className="panel success">{message}</div>}
        {error && <div className="panel error">{error}</div>}
        <form className="form-grid" onSubmit={createChange}>
          <label className="field full"><span>Template</span><select value={selectedTemplate} onChange={(e) => applyTemplate(e.target.value)}><option value="">Select template</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="field full"><span>Title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="field full"><span>Description</span><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="field"><span>Type</span><select value={form.change_type} onChange={(e) => setForm({ ...form, change_type: e.target.value })}>{changeTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
          <label className="field"><span>Risk</span><select value={form.risk_assessment} onChange={(e) => setForm({ ...form, risk_assessment: e.target.value })}>{riskLevels.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
          <label className="field"><span>Start</span><input type="datetime-local" value={form.change_window_start} onChange={(e) => setForm({ ...form, change_window_start: e.target.value })} /></label>
          <label className="field"><span>End</span><input type="datetime-local" value={form.change_window_end} onChange={(e) => setForm({ ...form, change_window_end: e.target.value })} /></label>
          <label className="field full"><span>Affected Systems</span><input value={form.affected_systems} onChange={(e) => setForm({ ...form, affected_systems: e.target.value })} placeholder="Service A, Service B" /></label>
          <label className="field full"><span>Implementation Plan</span><textarea rows={2} value={form.implementation_plan} onChange={(e) => setForm({ ...form, implementation_plan: e.target.value })} /></label>
          <label className="field full"><span>Rollback Plan</span><textarea rows={2} value={form.rollback_plan} onChange={(e) => setForm({ ...form, rollback_plan: e.target.value })} /></label>
          <label className="field full"><span>Business Impact</span><textarea rows={2} value={form.business_impact} onChange={(e) => setForm({ ...form, business_impact: e.target.value })} /></label>
          <label className="field full"><span>Communication Plan</span><textarea rows={2} value={form.communication_plan} onChange={(e) => setForm({ ...form, communication_plan: e.target.value })} /></label>
          <label className="field full"><span>Dependency Map</span><input value={form.dependency_map} onChange={(e) => setForm({ ...form, dependency_map: e.target.value })} /></label>
          {form.change_type === "emergency" && <label className="field full"><span>Emergency Justification</span><textarea rows={2} value={form.emergency_justification} onChange={(e) => setForm({ ...form, emergency_justification: e.target.value })} /></label>}
          <div className="field full"><h4 className="change-subheading">RACI</h4></div>
          <label className="field"><span>Implementer</span><select value={form.role_assignments.implementer_user_id} onChange={(e) => setForm({ ...form, role_assignments: { ...form.role_assignments, implementer_user_id: e.target.value } })}><option value="">Select user</option>{users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>)}</select></label>
          <label className="field"><span>Owner</span><select value={form.role_assignments.owner_user_id} onChange={(e) => setForm({ ...form, role_assignments: { ...form.role_assignments, owner_user_id: e.target.value } })}><option value="">Select user</option>{users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>)}</select></label>
          <label className="field"><span>Approver</span><select value={form.role_assignments.approver_user_id} onChange={(e) => setForm({ ...form, role_assignments: { ...form.role_assignments, approver_user_id: e.target.value } })}><option value="">Select approver</option>{users.filter((u) => ["it_manager", "system_admin"].includes(u.role)).map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>)}</select></label>
          <label className="field"><span>Business Owner</span><input value={form.role_assignments.business_owner} onChange={(e) => setForm({ ...form, role_assignments: { ...form.role_assignments, business_owner: e.target.value } })} /></label>
          <div className="field full"><h4 className="change-subheading">Technical Gates</h4><div className="change-checklist-grid">{Object.entries(form.technical_checklist).map(([k, v]) => <label key={k} className="inline-check"><input type="checkbox" checked={Boolean(v)} onChange={(e) => setForm({ ...form, technical_checklist: { ...form.technical_checklist, [k]: e.target.checked } })} />{k.replaceAll("_", " ")}</label>)}</div></div>
          {conflicts.length > 0 && <div className="field full change-conflicts"><div className="panel error conflict-warning"><strong>Conflict detected</strong><ul>{conflicts.map((c) => <li key={c.change_id}>{c.change_number} - {c.title} ({formatWindow(c.change_window_start, c.change_window_end)})</li>)}</ul><label className="inline-check"><input type="checkbox" checked={confirmSubmitWithConflict} onChange={(e) => setConfirmSubmitWithConflict(e.target.checked)} />I acknowledge and submit anyway</label></div></div>}
          <div className="field full"><button className="btn primary" type="submit">Submit Change</button></div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Change Requests</h2><p>Approval workflow with SLA and PIR visibility.</p></div><div className="change-filter"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="change-status-select"><option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div></div>
        <div className="approval-guide">
          <p><strong>Approval Comment:</strong> State what you validated: checklist, risk, schedule, and conditions for execution.</p>
          <p><strong>Approve:</strong> Use only when the plan, rollback, impact, and communication are complete and acceptable.</p>
          <p><strong>Reject:</strong> Use when required information is missing, risk is too high, or conflicts are unresolved.</p>
          <p><strong>Status:</strong> Move forward by execution phase: submitted -> approved -> scheduled -> implemented -> closed.</p>
        </div>
        <div className="user-table">{changes.length === 0 && <div className="empty-state">No change requests yet.</div>}
          {changes.map((c) => <div key={c.change_id} className="change-row"><div className={`user-row change-row-header ${expandedChangeId === c.change_id ? "expanded" : ""}`} role="button" tabIndex={0} onClick={() => setExpandedChangeId(expandedChangeId === c.change_id ? null : c.change_id)}><div><strong>{c.title}</strong><p>{c.change_number} | {c.change_type} | {c.risk_assessment}</p><p className="muted">SLA due: {c.approval_due_at ? new Date(c.approval_due_at).toLocaleString() : "N/A"} | PIR: {c.pir_required ? (c.pir_completed ? "Completed" : "Pending") : "Not required"}</p>{(approversByChange[c.change_id] || []).length > 0 && <p className="muted">Approvals: {(approversByChange[c.change_id] || []).map((a) => `${a.full_name || a.user_id} (${a.approval_status})`).join(", ")}</p>}</div><div className="user-actions" onClick={(e) => e.stopPropagation()}>{isManage && c.status === "submitted" && <><input value={approvalComments[c.change_id] || ""} onChange={(e) => setApprovalComments((p) => ({ ...p, [c.change_id]: e.target.value }))} placeholder="Decision note: checks done, risk call, conditions" title="Example: Checklist complete, rollback validated, approved for 22:00 UTC with NOC monitoring." /><button type="button" className="btn ghost" title="Approve when controls are complete and risk is acceptable." onClick={() => approve(c.change_id, "approved")}>Approve</button><button type="button" className="btn ghost" title="Reject when mandatory information or controls are missing." onClick={() => approve(c.change_id, "rejected")}>Reject</button></>}{isManage && c.status !== "rejected" ? <label className="change-status-label"><span className="muted">Status</span><select value={c.status} onChange={(e) => updateStatus(c.change_id, e.target.value)} className="change-status-select" title="Advance only after completion of the current execution phase.">{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label> : <span className={`badge badge-${c.status}`}>{c.status}</span>}{isManage && c.status === "rejected" && pendingDeleteId !== c.change_id && <button type="button" className="btn ghost danger" title="Delete only after recording a clear rejection reason." onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingDeleteId(c.change_id); }}>Delete</button>}{isManage && c.status === "rejected" && pendingDeleteId === c.change_id && <><button type="button" className="btn ghost danger" title="Permanent action. Removes the rejected request from the active list." onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteRejectedChange(c.change_id); }}>Confirm Delete</button><button type="button" className="btn ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingDeleteId(null); }}>Cancel</button></>}</div></div>{expandedChangeId === c.change_id && <div className="change-details"><div className="change-detail-section"><h4>Description</h4><p>{c.description || "-"}</p></div><div className="change-detail-section"><h4>Window</h4><p>{formatWindow(c.change_window_start, c.change_window_end)}</p></div><div className="change-detail-section"><h4>Business Impact</h4><p>{c.business_impact || "-"}</p></div><div className="change-detail-section"><h4>Communication Plan</h4><p>{c.communication_plan || "-"}</p></div><div className="change-detail-section"><h4>Dependency Map</h4><p>{c.dependency_map || "-"}</p></div></div>}</div>)}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Change Calendar</h2><p>Conflict-aware view of approved and scheduled windows.</p></div><div className="calendar-nav"><button className="btn ghost" type="button" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>{"<"}</button><span className="calendar-month-label">{format(calendarMonth, "MMMM yyyy")}</span><button className="btn ghost" type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>{">"}</button></div></div>
        <div className="calendar-wrapper"><div className="change-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="calendar-weekday">{d}</div>)}
          {(() => { const ms = startOfMonth(calendarMonth); const me = endOfMonth(calendarMonth); const start = startOfWeek(ms); const end = endOfWeek(me); const days = []; let day = start; while (day <= end) { days.push(day); day = addDays(day, 1); }
            const dayChanges = (d) => calendarChanges.filter((c) => c.change_window_start && c.change_window_end && isWithinInterval(d, { start: parseISO(c.change_window_start), end: parseISO(c.change_window_end) }));
            return days.map((d) => <div key={d.toISOString()} className={`calendar-day ${!isSameMonth(d, calendarMonth) ? "other-month" : ""}`}><span className="calendar-day-num">{format(d, "d")}</span><div className="calendar-day-events">{dayChanges(d).slice(0, 3).map((c) => <div key={c.change_id} className="calendar-event" title={`${c.change_number}: ${c.title}`}>{c.change_number}: {c.title}</div>)}{dayChanges(d).length > 3 && <div className="calendar-event-more">+{dayChanges(d).length - 3} more</div>}</div></div>);
          })()}
        </div></div>
      </div>
    </div>
  );
};

export default ChangeManagementPage;
