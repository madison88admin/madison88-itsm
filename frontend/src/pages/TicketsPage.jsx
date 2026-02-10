import React, { useEffect, useRef, useState } from "react";
import apiClient from "../api/client";

const statusColor = {
  New: "badge-new",
  "In Progress": "badge-progress",
  Pending: "badge-pending",
  Resolved: "badge-resolved",
  Closed: "badge-closed",
  Reopened: "badge-reopened",
};

const priorityColor = {
  P1: "badge-p1",
  P2: "badge-p2",
  P3: "badge-p3",
  P4: "badge-p4",
};

const statusOptions = [
  "",
  "New",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed",
  "Reopened",
];
const priorityOptions = ["", "P1", "P2", "P3", "P4"];
const categoryOptions = [
  "",
  "Hardware",
  "Software",
  "Access Request",
  "Account Creation",
  "Network",
  "Other",
];

const TicketsPage = ({
  onSelectTicket,
  refreshKey,
  selectedId,
  user,
  viewMode,
  onViewModeChange,
  onResolvedTickets,
}) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRefresh, setBulkRefresh] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [pollKey, setPollKey] = useState(0);
  const previousStatusRef = useRef(new Map());
  const isManager = user?.role === "it_manager";
  const isAdmin = user?.role === "system_admin";
  const canBulkAssign = isManager || isAdmin;
  const isTeamUrgentView = (isManager || isAdmin) && viewMode === "team";

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (user?.role === "end_user") {
          // backend limits to own tickets
        } else if (viewMode === "team") {
          // manager/admin global view
        } else if (assignmentFilter !== "unassigned") {
          params.assigned_to = user.user_id;
        }
        if (assignmentFilter === "unassigned") params.unassigned = true;
        if (includeArchived) params.include_archived = true;
        if (searchQuery.trim()) params.q = searchQuery.trim();
        if (tagQuery.trim()) params.tags = tagQuery.trim();
        if (statusFilter) params.status = statusFilter;
        if (priorityFilter) params.priority = priorityFilter;
        if (categoryFilter) params.category = categoryFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        const res = await apiClient.get("/tickets", { params });
        const nextTickets = res.data.data.tickets || [];
        if (onResolvedTickets) {
          const resolvedUpdates = [];
          nextTickets.forEach((ticket) => {
            const prevStatus = previousStatusRef.current.get(ticket.ticket_id);
            if (
              prevStatus &&
              prevStatus !== ticket.status &&
              ["Resolved", "Closed"].includes(ticket.status)
            ) {
              resolvedUpdates.push(ticket);
            }
          });
          if (resolvedUpdates.length > 0) {
            onResolvedTickets(resolvedUpdates);
          }
        }
        const nextStatusMap = new Map();
        nextTickets.forEach((ticket) => {
          nextStatusMap.set(ticket.ticket_id, ticket.status);
        });
        previousStatusRef.current = nextStatusMap;
        setTickets(nextTickets);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load tickets");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [
    refreshKey,
    viewMode,
    user?.role,
    user?.user_id,
    assignmentFilter,
    includeArchived,
    searchQuery,
    tagQuery,
    statusFilter,
    priorityFilter,
    categoryFilter,
    dateFrom,
    dateTo,
    bulkRefresh,
    pollKey,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      setPollKey((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!canBulkAssign) return;
    const fetchAgents = async () => {
      try {
        const res = await apiClient.get("/users?role=it_agent");
        setAgents(res.data.data.users || []);
      } catch (err) {
        setAgents([]);
      }
    };
    fetchAgents();
  }, [canBulkAssign]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatSlaCountdown = (ticket) => {
    if (!ticket?.sla_due_date) return null;
    const dueTime = new Date(ticket.sla_due_date).getTime();
    if (Number.isNaN(dueTime)) return null;
    const minutesLeft = Math.ceil((dueTime - now) / 60000);
    const breached = minutesLeft < 0;
    const absoluteMinutes = Math.abs(minutesLeft);
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;
    const timeLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    if (breached) {
      return {
        label: `SLA Breached ${timeLabel}`,
        className: "badge-sla-breached",
      };
    }
    if (minutesLeft <= 60) {
      return { label: `SLA ${timeLabel}`, className: "badge-sla-warning" };
    }
    return { label: `SLA ${timeLabel}`, className: "badge-sla" };
  };

  const getUrgencyScore = (ticket) => {
    const remaining = ticket?.sla_status?.resolution_remaining_minutes;
    if (typeof remaining === "number") return remaining;
    if (ticket?.sla_due_date) {
      const due = new Date(ticket.sla_due_date).getTime();
      if (!Number.isNaN(due)) return Math.ceil((due - now) / 60000);
    }
    return Number.MAX_SAFE_INTEGER;
  };

  const displayedTickets = (() => {
    if (!isTeamUrgentView) return tickets;
    const sorted = [...tickets].sort(
      (a, b) => getUrgencyScore(a) - getUrgencyScore(b),
    );
    return sorted.slice(0, 5);
  })();

  useEffect(() => {
    setSelectedTickets((prev) =>
      prev.filter((ticketId) => tickets.some((ticket) => ticket.ticket_id === ticketId))
    );
  }, [tickets]);

  const toggleTicketSelection = (ticketId) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignee || selectedTickets.length === 0) return;
    setBulkLoading(true);
    setError("");
    try {
      await apiClient.post("/tickets/bulk-assign", {
        ticket_ids: selectedTickets,
        assigned_to: bulkAssignee,
      });
      setSelectedTickets([]);
      setBulkAssignee("");
      setBulkRefresh((prev) => prev + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to bulk assign tickets");
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) {
    return <div className="panel">Loading tickets...</div>;
  }

  if (error) {
    return <div className="panel error">{error}</div>;
  }

  return (
    <div className={`panel ${isTeamUrgentView ? "team-queue-panel" : ""}`}>
      <div className="panel-header">
        <div>
          <h2>
            {user?.role === "end_user"
              ? "My Tickets"
              : viewMode === "team"
                ? "Team Queue"
                : "Assigned Tickets"}
          </h2>
          <p>Track open requests and recent updates.</p>
        </div>
        {(isManager || isAdmin) && onViewModeChange && (
          <div className="filter-bar">
            <button
              className={
                viewMode === "my" ? "filter-pill active" : "filter-pill"
              }
              onClick={() => onViewModeChange("my")}
            >
              My Tickets
            </button>
            <button
              className={
                viewMode === "team" ? "filter-pill active" : "filter-pill"
              }
              onClick={() => onViewModeChange("team")}
            >
              Team Queue
            </button>
          </div>
        )}
      </div>
      <div className="filter-bar ticket-filters">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search title, description, ticket number"
        />
        <input
          value={tagQuery}
          onChange={(e) => setTagQuery(e.target.value)}
          placeholder="Tags (comma-separated)"
        />
        {(isManager || isAdmin) && (
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
          >
            <option value="all">All assignments</option>
            <option value="unassigned">Unassigned only</option>
          </select>
        )}
        {(isManager || isAdmin) && (
          <label className="archive-toggle">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            <span>Show archived</span>
          </label>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map((option) => (
            <option key={option || "all"} value={option}>
              {option || "All Statuses"}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          {priorityOptions.map((option) => (
            <option key={option || "all"} value={option}>
              {option || "All Priorities"}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categoryOptions.map((option) => (
            <option key={option || "all"} value={option}>
              {option || "All Categories"}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="Created from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="Created to"
        />
      </div>
      {isTeamUrgentView && (
        <div className="urgent-note">
          Showing top 5 urgent tickets by SLA due time.
        </div>
      )}
      {canBulkAssign && (
        <div className="bulk-assign-bar">
          <span>{selectedTickets.length} selected</span>
          <select
            value={bulkAssignee}
            onChange={(e) => setBulkAssignee(e.target.value)}
          >
            <option value="">Assign to agent...</option>
            {agents.map((agent) => (
              <option key={agent.user_id} value={agent.user_id}>
                {agent.full_name}
              </option>
            ))}
          </select>
          <button
            className="btn primary"
            disabled={!bulkAssignee || selectedTickets.length === 0 || bulkLoading}
            onClick={handleBulkAssign}
          >
            {bulkLoading ? "Assigning..." : "Assign selected"}
          </button>
          <button
            className="btn ghost small"
            disabled={selectedTickets.length === 0}
            onClick={() => setSelectedTickets([])}
          >
            Clear
          </button>
        </div>
      )}
      <div className="ticket-list">
        {displayedTickets.length === 0 && (
          <div className="empty-state">
            No tickets yet. Create your first request.
          </div>
        )}
        {displayedTickets.map((ticket) => (
          <button
            key={ticket.ticket_id}
            className={`ticket-card ${
              selectedId === ticket.ticket_id ? "active" : ""
            }`}
            onClick={() => onSelectTicket(ticket.ticket_id)}
          >
            {canBulkAssign && (
              <div
                className="ticket-select"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selectedTickets.includes(ticket.ticket_id)}
                  onChange={() => toggleTicketSelection(ticket.ticket_id)}
                />
              </div>
            )}
            <div>
              <div className="ticket-title">{ticket.title}</div>
              <div className="ticket-meta">
                <span>{ticket.ticket_number}</span>
                <span>•</span>
                <span>{ticket.category}</span>
                {ticket.tags && (
                  <>
                    <span>•</span>
                    <span>{ticket.tags}</span>
                  </>
                )}
                <span>•</span>
                <span>{new Date(ticket.created_at).toLocaleString()}</span>
                <span>•</span>
                <span>
                  SLA Due:{" "}
                  {ticket.sla_due_date
                    ? new Date(ticket.sla_due_date).toLocaleString()
                    : "N/A"}
                </span>
              </div>
            </div>
            <div className="ticket-badges">
              <span className={`badge ${priorityColor[ticket.priority] || ""}`}>
                {ticket.priority}
              </span>
              <span className={`badge ${statusColor[ticket.status] || ""}`}>
                {ticket.status}
              </span>
              {ticket.sla_status?.escalated && (
                <span className="badge badge-sla-escalated">Escalated</span>
              )}
              {(() => {
                const sla = formatSlaCountdown(ticket);
                return sla ? (
                  <span className={`badge ${sla.className}`}>{sla.label}</span>
                ) : null;
              })()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TicketsPage;
