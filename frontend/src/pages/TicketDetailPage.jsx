import React, { useEffect, useState } from "react";
import apiClient from "../api/client";

const statusOptions = [
  "New",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed",
  "Reopened",
];

const priorityOptions = ["P1", "P2", "P3", "P4"];

const TicketDetailPage = ({ ticketId, user, onClose, onUpdated }) => {
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
        setAudit(auditRes.data.data.audit_logs || []);
        setPriorityRequests(overrideRequests);
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
    if (!commentText.trim()) return;
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
    if (status && status !== ticket.status) payload.status = status;
    if (priority && priority !== ticket.priority) {
      if (!priorityOverrideReason.trim()) {
        setError("Priority override reason required");
        return;
      }
      payload.priority = priority;
      payload.priority_override_reason = priorityOverrideReason.trim();
    }
    if (assignedTo !== (ticket.assigned_to || ""))
      payload.assigned_to = assignedTo || "";
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    try {
      await apiClient.patch(`/tickets/${ticketId}`, payload);
      const ticketRes = await apiClient.get(`/tickets/${ticketId}`);
      setTicket(ticketRes.data.data.ticket);
      setStatus(ticketRes.data.data.ticket?.status || "");
      setPriority(ticketRes.data.data.ticket?.priority || "");
      setAssignedTo(ticketRes.data.data.ticket?.assigned_to || "");
      setPriorityOverrideReason("");
      setAttachments(ticketRes.data.data.attachments || []);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update ticket");
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityOverrideRequest = async () => {
    if (!priorityRequestReason.trim()) {
      setError("Priority override reason required");
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

      <div className="detail-section">
        <h3>Attachments</h3>
        {attachments.length ? (
          <div className="attachment-list">
            {attachments.map((file) => (
              <div key={file.attachment_id} className="attachment-item">
                <span>{file.file_name}</span>
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
            placeholder="Add a comment for the IT team"
          />
          {canAddInternal && (
            <label className="inline-check">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              Internal note (visible to IT only)
            </label>
          )}
          <button
            className="btn primary"
            onClick={handleAddComment}
            disabled={saving}
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
