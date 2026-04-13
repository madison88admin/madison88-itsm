import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import KanbanBoard from "../components/kanban/KanbanBoard";
import apiClient from "../api/client";
import { getSocket } from "../api/socket";
import { toast } from "react-toastify";

const KanbanPage = ({ user }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const isItStaff = ["it_agent", "it_manager", "system_admin"].includes(user?.role);
    const canClaimTickets = user?.role === "it_agent";

    const loadTickets = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/tickets");
            setTickets(res.data.data.tickets || []);
        } catch (err) {
            setError("Failed to load tickets");
            toast.error("Error loading tickets");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleUpdate = () => {
            loadTickets();
        };

        socket.on("ticket-updated", handleUpdate);
        socket.on("ticket-created", handleUpdate);

        return () => {
            socket.off("ticket-updated", handleUpdate);
            socket.off("ticket-created", handleUpdate);
        };
    }, [loadTickets]);

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const ticketId = draggableId;
        const newStatus = destination.droppableId;

        // Optimistic Update
        const oldTickets = [...tickets];
        setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, status: newStatus } : t));

        try {
            await apiClient.patch(`/tickets/${ticketId}`, { status: newStatus });
        } catch (err) {
            setTickets(oldTickets);
            toast.error("Failed to update ticket status");
        }
    };

    const handleClaimTicket = async (ticket) => {
        if (!canClaimTickets || !ticket?.ticket_id || ticket.assigned_to) return;

        const oldTickets = [...tickets];
        setTickets((prev) => prev.map((item) => (
            item.ticket_id === ticket.ticket_id
                ? {
                    ...item,
                    assigned_to: user.user_id,
                    assignee_name: user.full_name || user.email || "Assigned agent",
                    status: item.status === "New" ? "In Progress" : item.status,
                }
                : item
        )));

        try {
            await apiClient.patch(`/tickets/${ticket.ticket_id}`, {
                assigned_to: user.user_id,
                status: ticket.status === "New" ? "In Progress" : ticket.status,
            });
            toast.success("Ticket is now assigned to you");
        } catch (err) {
            setTickets(oldTickets);
            toast.error(err.response?.data?.message || "Failed to claim ticket");
        }
    };

    if (!isItStaff) return <Navigate to="/" replace />;

    if (loading && tickets.length === 0) return <div className="loading-screen">Loading Kanban Board...</div>;

    return (
        <div className="kanban-page admin-dashboard">
            <div className="admin-hero" style={{ padding: '32px', marginBottom: '24px', borderRadius: '24px' }}>
                <div className="admin-hero-main">
                    <div className="admin-label">Workspace</div>
                    <h3>Kanban Flight Board</h3>
                    <p className="admin-subtext">Drag and drop cards to manage real-time resolution workflow.</p>
                </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <KanbanBoard
                tickets={tickets}
                onDragEnd={handleDragEnd}
                user={user}
                canClaimTickets={canClaimTickets}
                onClaimTicket={handleClaimTicket}
            />
        </div>
    );
};

export default KanbanPage;
