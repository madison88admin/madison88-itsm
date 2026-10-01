import { io } from "socket.io-client";

// Set REACT_APP_SOCKET_URL to a direct HTTPS VPS/tunnel endpoint when available.
// Netlify cannot upgrade WebSocket requests through the SPA route, so the
// same-origin Netlify fallback uses Socket.IO polling through the API proxy.
const explicitSocketUrl = (process.env.REACT_APP_SOCKET_URL || '').trim();
const apiSocketUrl = (process.env.REACT_APP_API_URL || '')
  .replace(/\/api\/?$/, '')
  .trim();
const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
const isNetlifyHost = currentHost.endsWith('.netlify.app');
const useNetlifyPolling = !explicitSocketUrl && !apiSocketUrl && isNetlifyHost;
const socketUrl = explicitSocketUrl || apiSocketUrl ||
  (typeof window !== 'undefined' ? window.location.origin : '');
const transports = useNetlifyPolling ? ['polling'] : ['websocket', 'polling'];

// Debug log (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('[Socket] Connecting to:', socketUrl, 'transports:', transports);
}

let socket = null;

export function getSocket() {
  if (!socket && typeof window !== "undefined") {
    socket = io(socketUrl, {
      path: "/socket.io",
      autoConnect: true,
      transports,
      upgrade: !useNetlifyPolling,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    // Connection event logs (dev only)
    if (process.env.NODE_ENV === 'development') {
      socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
      socket.on('disconnect', () => console.log('[Socket] Disconnected'));
      socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));
    }
  }
  return socket;
}

/**
 * Subscribe to dashboard-refresh events (e.g. after ticket create/update).
 * Call onRefresh when event is received. Returns unsubscribe function.
 */
export function onDashboardRefresh(onRefresh) {
  const s = getSocket();
  if (!s) return () => { };
  s.on("dashboard-refresh", onRefresh);
  return () => s.off("dashboard-refresh", onRefresh);
}

/**
 * Subscribe to ticket-specific updates when viewing a ticket.
 */
export function subscribeTicket(ticketId, onUpdate, user = null) {
  const s = getSocket();
  if (!s || !ticketId) return () => { };
  s.emit("subscribe-ticket", { ticketId, user });
  const handler = (payload) => onUpdate(payload);
  s.on("ticket-updated", handler);
  s.on("ticket-created", handler);
  s.on("ticket-comment", handler);
  s.on("ticket-reopened", handler);
  s.on("ticket-confirmed", handler);
  return () => {
    s.emit("unsubscribe-ticket", ticketId);
    s.off("ticket-updated", handler);
    s.off("ticket-created", handler);
    s.off("ticket-comment", handler);
    s.off("ticket-reopened", handler);
    s.off("ticket-confirmed", handler);
  };
}

/**
 * Presence: Notify backend we are viewing a ticket
 */
export function joinTicket(ticketId, user) {
  const s = getSocket();
  if (s && ticketId && user) {
    s.emit("join-ticket", { ticketId, user });
  }
}

/**
 * Presence: Notify backend we stopped viewing a ticket
 */
export function leaveTicket(ticketId) {
  const s = getSocket();
  if (s && ticketId) {
    s.emit("leave-ticket", ticketId);
  }
}

/**
 * Presence: Listen for viewer updates
 */
export function onPresenceUpdate(onUpdate) {
  const s = getSocket();
  if (!s) return () => { };
  s.on("presence-update", onUpdate);
  return () => s.off("presence-update", onUpdate);
}
