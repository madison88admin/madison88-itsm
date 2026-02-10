import React, { useEffect, useState } from "react";
import apiClient from "../api/client";
import { hasMaxLength, hasMinLength, isBlank } from "../utils/validation";

const statusOptions = [
  "New",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed",
  "Reopened",
];

const priorityOptions = ["P1", "P2", "P3", "P4"];

const TicketDetailPage = ({
  ticketId,
  user,
  onClose,
  onUpdated,
  onResolved,
}) => {
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [myAssets, setMyAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priorityOverrideReason, setPriorityOverrideReason] = useState("");
  const [priorityRequestPriority, setPriorityRequestPriority] = useState("P3");
  const [priorityRequestReason, setPriorityRequestReason] = useState("");
  const [priorityRequests, setPriorityRequests] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [resolutionCategory, setResolutionCategory] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [statusChangeReason, setStatusChangeReason] = useState("");
  const [escalations, setEscalations] = useState([]);
  const [escalationReason, setEscalationReason] = useState("");
  const [escalationSeverity, setEscalationSeverity] = useState("medium");
  const [escalationNotice, setEscalationNotice] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImpact, setEditImpact] = useState("");

  const isEndUser = user?.role === "end_user";
  const isManager = user?.role === "it_manager";
  const isAdmin = user?.role === "system_admin";
  const canSeeAudit = isAdmin;
  const canAddInternal = ["it_agent", "it_manager", "system_admin"].includes(
    user?.role,
  );
  const canAssign = isManager || isAdmin;
  const canOverridePriority = isAdmin;
  const canRequestPriorityOverride = isManager;
  const isAssignedToUser = ticket?.assigned_to && ticket.assigned_to === user?.user_id;
  const canComment = isEndUser ? ticket?.user_id === user?.user_id : isAssignedToUser;
  const canEscalate = !!isAssignedToUser;

  useEffect(() => {
    if (!ticketId) return;
    const fetchDetails = async () => {
      setLoading(true);
      setError("");
      setNotice("");
      try {
        const ticketRes = await apiClient.get(`/tickets/${ticketId}`);
        const auditRes = canSeeAudit
          ? await apiClient.get(`/tickets/${ticketId}/audit-log`)
          : { data: { data: { audit_logs: [] } } };
        const historyRes = await apiClient.get(
          `/tickets/${ticketId}/status-history`,
        );
        const escalationRes = await apiClient.get(
          `/tickets/${ticketId}/escalations`,
        );
        let overrideRequests = [];
        if (isAdmin || isManager) {
          try {
            const overrideRes = await apiClient.get(
              `/tickets/${ticketId}/priority-override-requests`,
            );
            overrideRequests = overrideRes.data.data.requests || [];
          } catch (err) {
            if (err.response?.status !== 404) {
              throw err;
            }
          }
        }
        const payload = ticketRes.data.data;
        setTicket(payload.ticket);
        setComments(payload.comments || []);
        setAttachments(payload.attachments || []);
        setAssets(payload.assets || []);
        setStatus(payload.ticket?.status || "");
        setPriority(payload.ticket?.priority || "");
        setAssignedTo(payload.ticket?.assigned_to || "");
        setPriorityOverrideReason("");
        setPriorityRequestPriority(payload.ticket?.priority || "P3");
        setEditTitle(payload.ticket?.title || "");
        setEditDescription(payload.ticket?.description || "");
        setEditImpact(payload.ticket?.business_impact || "");
        setResolutionSummary(payload.ticket?.resolution_summary || "");
        setResolutionCategory(payload.ticket?.resolution_category || "");
        setRootCause(payload.ticket?.root_cause || "");
        setStatusChangeReason("");
        setAudit(auditRes.data.data.audit_logs || []);
        setPriorityRequests(overrideRequests);
        setStatusHistory(historyRes.data.data.history || []);
        setEscalations(escalationRes.data.data.escalations || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load ticket details",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [ticketId, canSeeAudit]);

  useEffect(() => {
    if (!isEndUser) return;
    const fetchAssets = async () => {
      try {
        const res = await apiClient.get("/assets");
        setMyAssets(res.data.data.assets || []);
      } catch (err) {
        setMyAssets([]);
      }
    };

    fetchAssets();
  }, [isEndUser]);

  useEffect(() => {
    if (!canAssign) return;
    const fetchAgents = async () => {
      try {
        const res = await apiClient.get("/users?role=it_agent");
        setAgents(res.data.data.users || []);
      } catch (err) {
        setAgents([]);
      }
    };

    fetchAgents();
  }, [canAssign]);

  const handleAddComment = async () => {
    const trimmed = commentText.trim();
    if (isBlank(trimmed)) return;
    if (!hasMinLength(trimmed, 2)) {
      setError("Comment must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/tickets/${ticketId}/comments`, {
        comment_text: commentText.trim(),
        is_internal: isInternal,
      });
      setCommentText("");
      setIsInternal(false);
      if (onUpdated) onUpdated();
      const ticketRes = await apiClient.get(`/tickets/${ticketId}`);
      setComments(ticketRes.data.data.comments || []);
      setAttachments(ticketRes.data.data.attachments || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add comment");
    } finally {
      setSaving(false);
    }
  };

  const handleTicketUpdate = async () => {
    if (!ticket) return;
    const payload = {};
    const isStatusChange = status && status !== ticket.status;
    const isResolving =
      isStatusChange && ["Resolved", "Closed"].includes(status);
    if (isResolving) {
      if (!resolutionSummary.trim() || !resolutionCategory.trim() || !rootCause.trim()) {
        setError("Resolution summary, category, and root cause are required before resolving.");
        return;
      }
      if (!hasMinLength(resolutionSummary, 5)) {
        setError("Resolution summary must be at least 5 characters.");
        return;
      }
      if (!hasMinLength(resolutionCategory, 3)) {
        setError("Resolution category must be at least 3 characters.");
        return;
      }
      if (!hasMinLength(rootCause, 3)) {
        setError("Root cause must be at least 3 characters.");
        return;
      }
    }
    if (isStatusChange) payload.status = status;
    if (priority && priority !== ticket.priority) {
      if (!priorityOverrideReason.trim()) {
        setError("Priority override reason required");
        return;
      }
      if (!hasMinLength(priorityOverrideReason, 5)) {
        setError("Priority override reason must be at least 5 characters.");
        return;
      }
      payload.priority = priority;
      payload.priority_override_reason = priorityOverrideReason.trim();
    }
    if (statusChangeReason && !hasMaxLength(statusChangeReason, 255)) {
      setError("Status change reason must be 255 characters or less.");
      return;
    }
    if (assignedTo !== (ticket.assigned_to || ""))
      payload.assigned_to = assignedTo || "";
    if (resolutionSummary) payload.resolution_summary = resolutionSummary;
    if (resolutionCategory) payload.resolution_category = resolutionCategory;
    if (rootCause) payload.root_cause = rootCause;
    if (statusChangeReason) payload.status_change_reason = statusChangeReason;
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    const nextStatus = status;
    try {
      await apiClient.patch(`/tickets/${ticketId}`, payload);
      const ticketRes = await apiClient.get(`/tickets/${ticketId}`);
      setTicket(ticketRes.data.data.ticket);
      setStatus(ticketRes.data.data.ticket?.status || "");
      setPriority(ticketRes.data.data.ticket?.priority || "");
      setAssignedTo(ticketRes.data.data.ticket?.assigned_to || "");
      setPriorityOverrideReason("");
      setResolutionSummary(
        ticketRes.data.data.ticket?.resolution_summary || "",
      );
      setResolutionCategory(
        ticketRes.data.data.ticket?.resolution_category || "",
      );
      setRootCause(ticketRes.data.data.ticket?.root_cause || "");
      setStatusChangeReason("");
      setAttachments(ticketRes.data.data.attachments || []);
      const historyRes = await apiClient.get(
        `/tickets/${ticketId}/status-history`,
      );
      setStatusHistory(historyRes.data.data.history || []);
      if (isResolving && onResolved) {
        onResolved({ ...ticketRes.data.data.ticket, status: nextStatus });
      }
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update ticket");
    } finally {
      setSaving(false);
    }
  };

  const handleEscalate = async () => {
    if (!escalationReason.trim()) {
      setError("Escalation reason required");
      return;
    }
    if (!hasMinLength(escalationReason, 5)) {
      setError("Escalation reason must be at least 5 characters.");
      return;
    }
    setSaving(true);
    setError("");
    setEscalationNotice("");
    try {
      await apiClient.post(`/tickets/${ticketId}/escalations`, {
        reason: escalationReason.trim(),
        severity: escalationSeverity,
      });
      setEscalationReason("");
      setEscalationNotice("Escalation submitted.");
      const escalationRes = await apiClient.get(
        `/tickets/${ticketId}/escalations`,
      );
      setEscalations(escalationRes.data.data.escalations || []);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to escalate ticket");
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityOverrideRequest = async () => {
    if (!priorityRequestReason.trim()) {
      setError("Priority override reason required");
      return;
    }
    if (!hasMinLength(priorityRequestReason, 5)) {
      setError("Priority override reason must be at least 5 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiClient.post(`/tickets/${ticketId}/priority-override-requests`, {
        requested_priority: priorityRequestPriority,
        reason: priorityRequestReason.trim(),
      });
      setNotice("Priority override request submitted");
      setPriorityRequestReason("");
      const res = await apiClient.get(
        `/tickets/${ticketId}/priority-override-requests`,
      );
      setPriorityRequests(res.data.data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to request priority override",
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityOverrideReview = async (requestId, statusValue) => {
    setSaving(true);
    setError("");
    try {
      await apiClient.patch(
        `/tickets/${ticketId}/priority-override-requests/${requestId}`,
        { status: statusValue },
      );
      const res = await apiClient.get(
        `/tickets/${ticketId}/priority-override-requests`,
      );
      setPriorityRequests(res.data.data.requests || []);
      const ticketRes = await apiClient.get(`/tickets/${ticketId}`);
      setTicket(ticketRes.data.data.ticket);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to review priority override",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEndUserUpdate = async () => {
    if (!ticket) return;
    if (isBlank(editTitle) || !hasMinLength(editTitle, 5)) {
      setError("Title must be at least 5 characters.");
      return;
    }
    if (!hasMaxLength(editTitle, 255)) {
      setError("Title must be 255 characters or less.");
      return;
    }
    if (isBlank(editDescription) || !hasMinLength(editDescription, 10)) {
      setError("Description must be at least 10 characters.");
      return;
    }
    if (isBlank(editImpact) || !hasMinLength(editImpact, 10)) {
      setError("Business impact must be at least 10 characters.");
      return;
    }
    const payload = {};
    if (editTitle && editTitle !== ticket.title) payload.title = editTitle;
    if (editDescription && editDescription !== ticket.description) {
      payload.description = editDescription;
    }
    if (editImpact && editImpact !== ticket.business_impact) {
      payload.business_impact = editImpact;
    }
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    try {
      await apiClient.patch(`/tickets/${ticketId}`, payload);
      const ticketRes = await apiClient.get(`/tickets/${ticketId}`);
      setTicket(ticketRes.data.data.ticket);
      setEditTitle(ticketRes.data.data.ticket?.title || "");
      setEditDescription(ticketRes.data.data.ticket?.description || "");
      setEditImpact(ticketRes.data.data.ticket?.business_impact || "");
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update ticket");
    } finally {
      setSaving(false);
    }
  };

  const handleLinkAsset = async () => {
    if (!selectedAssetId || !ticketId) return;
    setSaving(true);
    try {
      await apiClient.post(`/assets/${selectedAssetId}/link-ticket`, {
        ticket_id: ticketId,
      });
      const ticketRes = await apiClient.get(`/tickets/${ticketId}`);
      setAssets(ticketRes.data.data.assets || []);
      setSelectedAssetId("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to link asset");
    } finally {
      setSaving(false);
    }
  };

  const stripHtml = (value) => value?.replace(/<[^>]*>/g, "") || "";

  const buildAttachmentUrl = (filePath) => {
    if (!filePath) return "";
    if (filePath.startsWith("http")) return filePath;
    const normalized = filePath.replace(/\\/g, "/");
    const baseOrigin = window.location.port === "3000"
      ? "http://localhost:3001"
      : window.location.origin;
    if (normalized.startsWith("/")) return `${baseOrigin}${normalized}`;
    if (normalized.startsWith("uploads/")) return `${baseOrigin}/${normalized}`;
    const fileName = normalized.split("/").pop();
    return fileName ? `${baseOrigin}/uploads/${fileName}` : normalized;
  };

  if (!ticketId) {
    return (
      <div className="panel detail-panel empty-state">
        Select a ticket to see details.
      </div>
    );
  }

  if (loading) {
    return <div className="panel detail-panel">Loading ticket...</div>;
  }

  if (error) {
    return <div className="panel detail-panel error">{error}</div>;
  }

  if (!ticket) {
    return <div className="panel detail-panel">Ticket not found.</div>;
  }

  const canEditEndUser =
    isEndUser && ["New", "Pending"].includes(ticket.status);

  return (
    <div className="panel detail-panel">
      <div className="detail-header">
        <div>
          <h2>{ticket.title}</h2>
          <p>{ticket.ticket_number}</p>
        </div>
        <div className="detail-actions">
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <span>Category</span>
          <strong>{ticket.category}</strong>
        </div>
        <div>
          <span>Tags</span>
          <strong>{ticket.tags || "None"}</strong>
        </div>
        <div>
          <span>Priority</span>
          <strong>{ticket.priority}</strong>
        </div>
        <div>
          <span>Ticket Type</span>
          <strong>{ticket.ticket_type || "incident"}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{ticket.status}</strong>
        </div>
        <div>
          <span>Location</span>
          <strong>{ticket.location}</strong>
        </div>
        <div>
          <span>Assigned To</span>
          <strong>{ticket.assigned_to || "Unassigned"}</strong>
        </div>
        <div>
          <span>Created</span>
          <strong>{new Date(ticket.created_at).toLocaleString()}</strong>
        </div>
        <div>
          <span>SLA Due</span>
          <strong>
            {ticket.sla_due_date
              ? new Date(ticket.sla_due_date).toLocaleString()
              : "N/A"}
          </strong>
        </div>
        <div>
          <span>SLA Escalation</span>
          <strong>
            {ticket.sla_status?.escalated ? "Escalated" : "On Track"}
          </strong>
        </div>
        <div>
          <span>SLA Remaining (mins)</span>
          <strong>
            {ticket.sla_status?.resolution_remaining_minutes ?? "N/A"}
          </strong>
        </div>
      </div>

      {isEndUser && (
        <div className="detail-update">
          <label className="field">
            <span>Title</span>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={!canEditEndUser}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={!canEditEndUser}
            />
          </label>
          <label className="field">
            <span>Business Impact</span>
            <textarea
              rows={3}
              value={editImpact}
              onChange={(e) => setEditImpact(e.target.value)}
              disabled={!canEditEndUser}
            />
          </label>
          {!canEditEndUser && (
            <p className="muted">
              Edits are locked once the ticket is In Progress or resolved.
            </p>
          )}
          <button
            className="btn primary"
            onClick={handleEndUserUpdate}
            disabled={saving || !canEditEndUser}
          >
            Update Details
          </button>
        </div>
      )}

      {!isEndUser && (
        <div className="detail-update">
          <label className="field">
            <span>Update Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {canOverridePriority && (
            <label className="field">
              <span>Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canOverridePriority && priority !== ticket.priority && (
            <label className="field">
              <span>Priority Override Reason</span>
              <input
                value={priorityOverrideReason}
                onChange={(e) => setPriorityOverrideReason(e.target.value)}
                placeholder="Explain why priority changed"
              />
            </label>
          )}
          {canAssign && (
            <label className="field">
              <span>Assigned To</span>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.user_id} value={agent.user_id}>
                    {agent.full_name || agent.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>Status Change Reason (optional)</span>
            <input
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              placeholder="Why did this status change?"
            />
          </label>
          {(status === "Resolved" || status === "Closed") && (
            <>
              <label className="field">
                <span>Resolution Summary</span>
                <textarea
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Describe how the issue was resolved."
                />
              </label>
              <label className="field">
                <span>Resolution Category</span>
                <input
                  value={resolutionCategory}
                  onChange={(e) => setResolutionCategory(e.target.value)}
                  placeholder="Example: Configuration, Hardware, Access"
                />
              </label>
              <label className="field">
                <span>Root Cause</span>
                <input
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Root cause of the issue"
                />
              </label>
            </>
          )}
          <button
            className="btn primary"
            onClick={handleTicketUpdate}
            disabled={saving}
          >
            Update
          </button>
        </div>
      )}

      {canRequestPriorityOverride && (
        <div className="detail-section">
          <h3>Request Priority Override</h3>
          {notice && <p className="muted">{notice}</p>}
          <div className="comment-form">
            <select
              value={priorityRequestPriority}
              onChange={(e) => setPriorityRequestPriority(e.target.value)}
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={priorityRequestReason}
              onChange={(e) => setPriorityRequestReason(e.target.value)}
              placeholder="Why should this priority change?"
            />
            <button
              className="btn ghost"
              onClick={handlePriorityOverrideRequest}
              disabled={saving}
            >
              Submit Request
            </button>
          </div>
        </div>
      )}

      {(isAdmin || isManager) && priorityRequests.length > 0 && (
        <div className="detail-section">
          <h3>Priority Override Requests</h3>
          <div className="comment-list">
            {priorityRequests.map((request) => (
              <div key={request.request_id} className="comment-item">
                <div>
                  <strong>{request.requested_by_name || "Requester"}</strong>
                  <span>{new Date(request.created_at).toLocaleString()}</span>
                </div>
                <p>
                  Requested: {request.requested_priority} · Status:{" "}
                  {request.status}
                </p>
                <p>{request.reason}</p>
                {isAdmin && request.status === "pending" && (
                  <div className="comment-form">
                    <button
                      className="btn ghost"
                      onClick={() =>
                        handlePriorityOverrideReview(
                          request.request_id,
                          "approved",
                        )
                      }
                      disabled={saving}
                    >
                      Approve
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() =>
                        handlePriorityOverrideReview(
                          request.request_id,
                          "rejected",
                        )
                      }
                      disabled={saving}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="detail-section">
        <h3>Description</h3>
        <p>{stripHtml(ticket.description)}</p>
      </div>

      <div className="detail-section">
        <h3>Business Impact</h3>
        <p>{ticket.business_impact}</p>
      </div>

      {(ticket.resolution_summary || ticket.resolution_category || ticket.root_cause) && (
        <div className="detail-section">
          <h3>Resolution</h3>
          <p>{ticket.resolution_summary || "No resolution summary."}</p>
          <div className="ticket-meta">
            <span>{ticket.resolution_category || "Uncategorized"}</span>
            <span>•</span>
            <span>{ticket.root_cause || "Root cause not set"}</span>
          </div>
        </div>
      )}

      <div className="detail-section">
        <h3>Attachments</h3>
        {attachments.length ? (
          <div className="attachment-list">
            {attachments.map((file) => (
              <div key={file.attachment_id} className="attachment-item">
                <a
                  href={buildAttachmentUrl(file.file_path)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.file_name}
                </a>
                <span>{file.file_type || "file"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No attachments.</p>
        )}
      </div>

      <div className="detail-section">
        <h3>Linked Assets</h3>
        {assets.length === 0 && <p className="muted">No linked assets.</p>}
        {assets.map((asset) => (
          <div key={asset.asset_id} className="ticket-meta">
            <span>{asset.asset_tag}</span>
            <span>•</span>
            <span>{asset.asset_type}</span>
            <span>•</span>
            <span>{asset.status}</span>
          </div>
        ))}
        {isEndUser && (
          <div className="comment-form">
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
            >
              <option value="">Select your asset</option>
              {myAssets.map((asset) => (
                <option key={asset.asset_id} value={asset.asset_id}>
                  {asset.asset_tag} ({asset.asset_type})
                </option>
              ))}
            </select>
            <button
              className="btn ghost"
              onClick={handleLinkAsset}
              disabled={saving}
            >
              Link Asset
            </button>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Status History</h3>
        <div className="audit-list">
          {statusHistory.length === 0 && (
            <p className="muted">No status changes yet.</p>
          )}
          {statusHistory.map((entry) => (
            <div key={entry.status_id} className="audit-item">
              <div>
                <strong>
                  {entry.old_status ? `${entry.old_status} → ` : ""}
                  {entry.new_status}
                </strong>
                <span>{new Date(entry.changed_at).toLocaleString()}</span>
              </div>
              <p>{entry.change_reason || "Status updated"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h3>Escalations</h3>
        {escalationNotice && <p className="muted">{escalationNotice}</p>}
        <div className="audit-list">
          {escalations.length === 0 && (
            <p className="muted">No escalations logged.</p>
          )}
          {escalations.map((entry) => (
            <div key={entry.escalation_id} className="audit-item">
              <div>
                <strong>{entry.severity}</strong>
                <span>{new Date(entry.escalated_at).toLocaleString()}</span>
              </div>
              <p>{entry.reason}</p>
            </div>
          ))}
        </div>
        {canEscalate && (
          <div className="comment-form">
            <select
              value={escalationSeverity}
              onChange={(e) => setEscalationSeverity(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="Reason for escalation"
            />
            <button
              className="btn ghost"
              onClick={handleEscalate}
              disabled={saving}
            >
              Escalate Ticket
            </button>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Comments</h3>
        <div className="comment-list">
          {comments.length === 0 && <p className="muted">No comments yet.</p>}
          {comments.map((comment) => (
            <div key={comment.comment_id} className="comment-item">
              <div>
                <strong>{comment.full_name || "User"}</strong>
                <span>{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p>{comment.comment_text}</p>
            </div>
          ))}
        </div>
        <div className="comment-form">
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={
              canComment
                ? "Add a comment for the IT team"
                : "Only the assigned agent can add resolution comments."
            }
            disabled={!canComment}
          />
          {canAddInternal && (
            <label className="inline-check">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                disabled={!canComment}
              />
              Internal note (visible to IT only)
            </label>
          )}
          {!canComment && !isEndUser && (
            <p className="muted">
              This ticket is assigned to someone else.
            </p>
          )}
          <button
            className="btn primary"
            onClick={handleAddComment}
            disabled={saving || !canComment}
          >
            Add Comment
          </button>
        </div>
      </div>
      {canSeeAudit && (
        <div className="detail-section">
          <h3>Audit Trail</h3>
          <div className="audit-list">
            {audit.length === 0 && (
              <p className="muted">No audit entries yet.</p>
            )}
            {audit.map((log) => (
              <div key={log.log_id} className="audit-item">
                <div>
                  <strong>{log.action_type}</strong>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p>{log.description || "Updated"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailPage;
