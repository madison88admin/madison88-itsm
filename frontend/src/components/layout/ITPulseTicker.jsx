import React, { useEffect, useState, useRef } from 'react';
import apiClient from '../../api/client';
import { getSocket } from '../../api/socket';
import {
    CheckCircleIcon,
    InformationCircleIcon,
    RssIcon,
    AdjustmentsHorizontalIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const ITPulseTicker = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const marqueeRef = useRef(null);

    useEffect(() => {
        const fetchPulse = async () => {
            try {
                const res = await apiClient.get('/dashboard/pulse');
                setEvents(res.data.data.events || []);
            } catch (err) {
                console.error('Failed to fetch pulse', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPulse();

        const socket = getSocket();
        if (socket) {
            // Listen for real-time pulse updates
            socket.on('pulse-update', (newEvent) => {
                setEvents(prev => [newEvent, ...prev].slice(0, 20));
            });
        }

        return () => {
            if (socket) {
                socket.off('pulse-update');
            }
        };
    }, []);

    if (loading && events.length === 0) return null;

    return (
        <div className="it-pulse-ticker">
            <div className="pulse-label">
                <AdjustmentsHorizontalIcon className="h-3.5 w-3.5 pulse-icon-anim" />
                <span>IT PULSE</span>
            </div>
            <div className="marquee-container" ref={marqueeRef}>
                <div className="marquee-content">
                    {/* Render twice for seamless loop */}
                    {[...events, ...events].map((event, index) => (
                        <div key={`${event.type}-${index}`} className="pulse-item">
                            {getIcon(event.type)}
                            <span className="pulse-text">{event.text}</span>
                            <span className="pulse-divider">|</span>
                        </div>
                    ))}
                    {events.length === 0 && (
                        <div className="pulse-item">
                            <InformationCircleIcon className="h-3.5 w-3.5" style={{ color: 'var(--cyan-400)' }} />
                            <span className="pulse-text">System operational. No recent events.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const getIcon = (type) => {
    switch (type) {
        case 'resolution':
            return <CheckCircleIcon className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />;
        case 'kb':
            return <RssIcon className="h-3.5 w-3.5" style={{ color: 'var(--cyan-400)' }} />;
        case 'metric':
            return <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" style={{ color: 'var(--blue-400)' }} />;
        default:
            return <InformationCircleIcon className="h-3.5 w-3.5" style={{ color: 'var(--slate-400)' }} />;
    }
};

export default ITPulseTicker;
