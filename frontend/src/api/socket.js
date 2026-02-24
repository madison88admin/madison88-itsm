import { io } from "socket.io-client";

const resolvedApiBase = (import.meta.env?.VITE_API_URL) || process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
let socketUrl;
try {
  // Ensure we have a valid URL; if env lacks protocol, the URL constructor will resolve against origin
  const parsed = new URL(resolvedApiBase, (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'));
  const socketProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  socketUrl = `${socketProtocol}//${parsed.host}`;
} catch (err) {
  // Fallback: best-effort replacement
  const host = String(resolvedApiBase).replace(/\/$/, '');
  const proto = host.startsWith('https') ? 'wss:' : 'ws:';
  socketUrl = host.replace(/^https?:/, proto);
}
let socket = null;

export function getSocket() {
  if (!socket && typeof window !== "undefined") {
    socket = io(socketUrl, {
      path: "/socket.io",
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
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
