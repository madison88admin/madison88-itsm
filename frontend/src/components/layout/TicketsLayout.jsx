import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TicketsPage from '../../pages/TicketsPage';
import TicketDetailPage from '../../pages/TicketDetailPage';

const TicketsLayout = ({ user, viewMode, refreshKey, setRefreshKey, onResolvedTickets }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { ticketId } = useParams();

    // ticketId is a UUID string from the URL param
    const selectedTicketId = (ticketId && ticketId !== 'null') ? ticketId : null;

    const handleSelectTicket = (id) => {
        const basePath = viewMode === 'team' ? '/team-queue' : '/tickets';
        navigate(`${basePath}/${id}${location.search || ''}`);
    };

    const handleClose = () => {
        const basePath = viewMode === 'team' ? '/team-queue' : '/tickets';
        navigate(`${basePath}${location.search || ''}`);
    };

    return (
        <div className="tickets-layout" style={{ position: 'relative' }}>
            <TicketsPage
                refreshKey={refreshKey}
                user={user}
                viewMode={viewMode}
                onViewModeChange={(mode) => {
                    const query = location.search || '';
                    if (mode === 'team') navigate(`/team-queue${query}`);
                    else navigate(`/tickets${query}`);
                }}
                selectedId={selectedTicketId}
                onSelectTicket={handleSelectTicket}
                onResolvedTickets={onResolvedTickets}
            />

            {selectedTicketId && (
                <div className="modal-overlay" onClick={handleClose}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                        <TicketDetailPage
                            ticketId={selectedTicketId}
                            user={user}
                            onClose={handleClose}
                            onUpdated={() => setRefreshKey((prev) => prev + 1)}
                            onResolved={onResolvedTickets}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketsLayout;
