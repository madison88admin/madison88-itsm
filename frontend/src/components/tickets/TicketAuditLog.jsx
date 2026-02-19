import React, { useRef, useEffect } from "react";

const TicketAuditLog = ({ audit = [] }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [audit]);

    return (
        <div className="ticket-audit-log glass">
            <div className="log-header">
                <h3>AUDIT TRAIL</h3>
            </div>

            <div className="log-list" ref={scrollRef}>
                {audit.length === 0 ? (
                    <div className="empty-state">No activity logs recorded.</div>
                ) : (
                    audit.map((item, idx) => (
                        <div key={item.log_id || idx} className="log-entry">
                            <div className="log-dot"></div>
                            <div className="log-info">
                                <div className="log-main">
                                    <strong>{item.full_name}</strong> {item.description}
                                </div>
                                <div className="log-time">
                                    {new Date(item.timestamp).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style>{`
                .ticket-audit-log {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: rgba(15, 23, 42, 0.3);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .log-header {
                    padding: 1.2rem 2rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    background: rgba(15, 23, 42, 0.2);
                }
                .log-header h3 {
                    margin: 0;
                    font-size: 0.7rem;
                    font-weight: 900;
                    color: #475569;
                    letter-spacing: 0.15em;
                }

                .log-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .empty-state {
                    text-align: center;
                    color: #475569;
                    font-size: 0.8rem;
                    margin-top: 2rem;
                }

                .log-entry {
                    display: flex;
                    gap: 1.2rem;
                    position: relative;
                }

                .log-entry:not(:last-child)::after {
                    content: "";
                    position: absolute;
                    left: 4px;
                    top: 20px;
                    bottom: -20px;
                    width: 1px;
                    background: rgba(255,255,255,0.05);
                }

                .log-dot {
                    width: 9px;
                    height: 9px;
                    border-radius: 50%;
                    background: #2fd7ff;
                    margin-top: 5px;
                    box-shadow: 0 0 10px rgba(47, 215, 255, 0.3);
                    z-index: 2;
                }

                .log-info {
                    flex: 1;
                }

                .log-main {
                    font-size: 0.85rem;
                    color: #94a3b8;
                    line-height: 1.4;
                }
                .log-main strong {
                    color: #f8fafc;
                    font-weight: 600;
                }

                .log-time {
                    font-size: 0.65rem;
                    color: #475569;
                    margin-top: 0.4rem;
                }
            `}</style>
        </div>
    );
};

export default TicketAuditLog;
