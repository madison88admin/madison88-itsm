import React, { useState } from "react";
import TicketContextPanel from "./TicketContextPanel";
import TicketConversation from "./TicketConversation";
import TicketActionPanel from "./TicketActionPanel";
import AuditLogModal from "./AuditLogModal";

const GlassyTicketLayout = ({
    ticket,
    user,
    comments,
    assets,
    audit,
    onCommentAdded,
    onTicketUpdated,
    canPermanentlyDelete = false,
    canPermanentlyDeleteNow = false,
    onPermanentDelete,
    deleteInProgress = false,
    onClose
}) => {
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleteError, setDeleteError] = useState("");

    const submitPermanentDelete = async () => {
        setDeleteError("");
        if (!onPermanentDelete) return;
        const ok = await onPermanentDelete({
            reason: deleteReason,
            confirmText: deleteConfirmText
        });
        if (ok) {
            setIsDeleteModalOpen(false);
            setDeleteReason("");
            setDeleteConfirmText("");
        } else {
            setDeleteError("Delete failed. Check confirmation and ticket status.");
        }
    };

    return (
        <div className="glassy-workspace animate-fade-in">
            <div className="workspace-header">
                <div className="header-left">
                    <button onClick={onClose} className="back-btn">← BACK</button>
                    <span className="breadcrumb">{ticket.ticket_number} <strong>{ticket.title}</strong></span>
                </div>
                <div className="header-right">
                    {canPermanentlyDelete && (
                        <button
                            className="header-action-btn danger"
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            DELETE TICKET
                        </button>
                    )}
                    <button
                        className="header-action-btn"
                        onClick={() => setIsAuditModalOpen(true)}
                    >
                        TICKET LOG
                    </button>
                    <span className={`status-pill ${ticket.status.toLowerCase().replace(' ', '-')}`}>
                        {ticket.status.toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="workspace-grid">
                {/* Left: Context */}
                <div className="workspace-col col-left">
                    <TicketContextPanel ticket={ticket} user={user} assets={assets} />
                </div>

                {/* Middle: Conversation */}
                <div className="workspace-col col-main">
                    <TicketConversation
                        ticketId={ticket.ticket_id}
                        comments={comments}
                        audit={audit}
                        onCommentAdded={onCommentAdded}
                    />
                </div>

                {/* Right: Actions */}
                <div className="workspace-col col-right">
                    <TicketActionPanel
                        ticket={ticket}
                        user={user}
                        onUpdate={onTicketUpdated}
                    />
                </div>
            </div>

            <AuditLogModal
                isOpen={isAuditModalOpen}
                onClose={() => setIsAuditModalOpen(false)}
                audit={audit}
                user={user}
            />

            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="delete-modal">
                        <h3>Permanent Delete Ticket</h3>
                        <p>This action is irreversible. Type <strong>DELETE</strong> and provide a reason.</p>
                        {!canPermanentlyDeleteNow && (
                            <p className="delete-error">
                                Ticket must be Archived, Resolved, or Closed before permanent deletion.
                            </p>
                        )}

                        <label className="delete-field">
                            <span>Reason</span>
                            <textarea
                                rows={3}
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Reason for permanent deletion"
                            />
                        </label>

                        <label className="delete-field">
                            <span>Confirmation Text</span>
                            <input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE"
                            />
                        </label>

                        {deleteError && <p className="delete-error">{deleteError}</p>}

                        <div className="delete-actions">
                            <button
                                className="header-action-btn"
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setDeleteError("");
                                }}
                                disabled={deleteInProgress}
                            >
                                Cancel
                            </button>
                            <button
                                className="header-action-btn danger"
                                onClick={submitPermanentDelete}
                                disabled={deleteInProgress || !canPermanentlyDeleteNow}
                            >
                                {deleteInProgress ? "Deleting..." : "Confirm Permanent Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .glassy-workspace {
            display: flex;
            flex-direction: column;
            height: 100%; /* Fill the fixed 90vh container */
            background: rgba(10, 22, 53, 0.4); /* Transparent to show global bg */
            backdrop-filter: blur(40px);
            color: #f8fafc;
            overflow: hidden; /* Prevent workspace overflow */
            font-family: 'Sora', sans-serif;
            border-radius: 20px;
            box-shadow: 0 40px 100px rgba(0,0,0,0.6);
            border: 1px solid rgba(47, 215, 255, 0.2); /* High-fidelity border */
        }

        .workspace-header {
            height: 72px;
            flex: 0 0 auto; /* Fixed header */
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 2rem;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(20px);
            z-index: 10;
        }

        .header-left, .header-right {
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }

        .header-action-btn {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            letter-spacing: 0.05em;
        }
        .header-action-btn:hover {
            background: rgba(59, 130, 246, 0.2);
            border-color: #3b82f6;
            color: white;
            transform: translateY(-1px);
        }
        .header-action-btn.danger {
            background: rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.4);
            color: #fca5a5;
        }
        .header-action-btn.danger:hover {
            background: rgba(239, 68, 68, 0.25);
            border-color: #ef4444;
            color: #fff;
        }

        .workspace-grid {
            flex: 1;
            display: grid;
            grid-template-columns: 280px 1fr 300px;
            gap: 0;
            overflow: hidden; /* Prevent grid overflow */
        }

        .workspace-col {
            background: transparent;
            overflow-y: auto; /* Enable independent scrolling */
            display: flex;
            flex-direction: column;
            padding: 0; /* Let children components handle their own padding */
            border-right: 1px solid rgba(255,255,255,0.05);
        }

        .workspace-col.col-right {
            border-right: none;
        }

        .workspace-col.col-main {
            background: rgba(255,255,255,0.02);
        }

        .back-btn {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: #94a3b8;
            font-weight: 600;
            font-size: 0.75rem;
            cursor: pointer;
            margin-right: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .back-btn:hover { color: white; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }

        .breadcrumb {
            color: #94a3b8;
            font-weight: 500;
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 600px;
            display: inline-block;
            vertical-align: middle;
        }
        .breadcrumb strong { color: #f8fafc; font-weight: 600; margin-left: 0.5rem; }

        .status-pill {
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.5rem 1.25rem;
            border-radius: 8px;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .status-new { background: linear-gradient(to bottom right, #3b82f6, #2563eb); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .status-in-progress { background: linear-gradient(to bottom right, #f59e0b, #d97706); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
        .status-resolved { background: linear-gradient(to bottom right, #10b981, #059669); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .status-closed { background: #475569; }

        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(2, 6, 23, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1200;
        }
        .delete-modal {
            width: min(560px, 92vw);
            background: #0b1220;
            border: 1px solid rgba(239, 68, 68, 0.35);
            border-radius: 12px;
            padding: 1rem;
            display: grid;
            gap: 0.75rem;
        }
        .delete-modal h3 {
            margin: 0;
            color: #fca5a5;
        }
        .delete-modal p {
            margin: 0;
            color: #cbd5e1;
            font-size: 0.9rem;
        }
        .delete-field {
            display: grid;
            gap: 0.35rem;
        }
        .delete-field span {
            color: #94a3b8;
            font-size: 0.8rem;
        }
        .delete-field input,
        .delete-field textarea {
            background: rgba(15, 23, 42, 0.7);
            color: #e2e8f0;
            border: 1px solid rgba(148, 163, 184, 0.25);
            border-radius: 8px;
            padding: 0.55rem 0.7rem;
            font-family: inherit;
        }
        .delete-error {
            margin: 0;
            color: #fca5a5;
            font-size: 0.8rem;
        }
        .delete-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.6rem;
        }
        @media (max-width: 1100px) {
            .glassy-workspace {
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
            }
            .workspace-header {
                height: auto !important;
                padding: 1rem !important;
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 1rem !important;
            }
            .workspace-grid {
                display: flex !important;
                flex-direction: column !important;
                height: auto !important;
                overflow: visible !important;
                gap: 20px !important;
            }
            .workspace-col {
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                background: rgba(15, 23, 42, 0.4) !important;
                border-radius: 12px !important;
                padding: 10px !important;
            }
            .workspace-col.col-main {
                min-height: auto !important;
                order: 2 !important;
            }
            .workspace-col.col-left {
                order: 1 !important;
            }
            .workspace-col.col-right {
                order: 3 !important;
            }
            .breadcrumb {
                max-width: 100% !important;
                white-space: normal !important;
            }
        }
      `}</style>
        </div>
    );
};

export default GlassyTicketLayout;
