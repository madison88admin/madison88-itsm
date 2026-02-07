import React, { useEffect, useState } from "react";
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

const TicketsPage = ({
  onSelectTicket,
  refreshKey,
  selectedId,
  user,
  viewMode,
  onViewModeChange,
}) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isManager = user?.role === "it_manager";
  const isAdmin = user?.role === "system_admin";

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const params = {};
        if (user?.role === "end_user") {
          // backend limits to own tickets
        } else if (viewMode === "team") {
          // manager/admin global view
        } else {
          params.assigned_to = user.user_id;
        }
        const res = await apiClient.get("/tickets", { params });
        setTickets(res.data.data.tickets || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load tickets");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [refreshKey, viewMode, user?.role, user?.user_id]);

  if (loading) {
    return <div className="panel">Loading tickets...</div>;
  }

  if (error) {
    return <div className="panel error">{error}</div>;
  }

  return (
    <div className="panel">
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
      <div className="ticket-list">
        {tickets.length === 0 && (
          <div className="empty-state">
            No tickets yet. Create your first request.
          </div>
        )}
        {tickets.map((ticket) => (
          <button
            key={ticket.ticket_id}
            className={`ticket-card ${
              selectedId === ticket.ticket_id ? "active" : ""
            }`}
            onClick={() => onSelectTicket(ticket.ticket_id)}
          >
            <div>
              <div className="ticket-title">{ticket.title}</div>
              <div className="ticket-meta">
                <span>{ticket.ticket_number}</span>
                <span>•</span>
                <span>{ticket.category}</span>
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
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TicketsPage;
