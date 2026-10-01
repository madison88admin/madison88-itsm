import React, { lazy, Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import apiClient from "./api/client";
import { clearAuthToken, setAuthToken } from "./api/session";
import { getSocket } from "./api/socket";
import ErrorBoundary from "./components/ErrorBoundary";

// Layouts & Pages
import MainLayout from "./components/layout/MainLayout";
import TicketsLayout from "./components/layout/TicketsLayout";
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const NewTicketPage = lazy(() => import("./pages/NewTicketPage"));
const KnowledgeBasePage = lazy(() => import("./pages/KnowledgeBasePage"));
const KnowledgeBaseEditor = lazy(() => import("./pages/KnowledgeBaseEditor"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const AdminSlaPage = lazy(() => import("./pages/AdminSlaPage"));
const ChangeManagementPage = lazy(() => import("./pages/ChangeManagementPage"));
const AssetsPage = lazy(() => import("./pages/AssetsPage"));
const AdvancedReportingPage = lazy(() => import("./pages/AdvancedReportingPage"));
const TicketTemplatesPage = lazy(() => import("./pages/TicketTemplatesPage"));
const UserDashboard = lazy(() => import("./pages/dashboards/UserDashboard"));
const AgentDashboard = lazy(() => import("./pages/dashboards/AgentDashboard"));
const ManagerDashboard = lazy(() => import("./pages/dashboards/ManagerDashboard"));
const AdminDashboard = lazy(() => import("./pages/dashboards/AdminDashboard"));
const KanbanPage = lazy(() => import("./pages/KanbanPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

const defaultNotificationPrefs = {
  ticket_updates_enabled: true,
  broadcast_enabled: true,
  browser_push_enabled: true,
  email_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  timezone: "Asia/Manila",
};

const parseMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "00:00").split(":").map((v) => Number(v));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return (h * 60) + m;
};

const isNowInQuietHours = (prefs) => {
  if (!prefs?.quiet_hours_enabled) return false;
  const start = parseMinutes(prefs.quiet_hours_start);
  const end = parseMinutes(prefs.quiet_hours_end);
  const now = new Date();
  const current = (now.getHours() * 60) + now.getMinutes();
  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
};

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotificationPrefs);
  const [browserPermission, setBrowserPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const recentNotificationRef = useRef(new Map());
  const navigate = useNavigate();
  const location = useLocation();

  // Load user and verify session on mount
  useEffect(() => {
    const publicPaths = new Set(["/login", "/signup", "/reset-password"]);
    if (publicPaths.has(location.pathname)) {
      setLoadingUser(false);
      return undefined;
    }

    const initAuth = async () => {
      try {
        // The HttpOnly cookie is the source of truth. Never trust a cached user
        // object without a server-verified session.
        const res = await apiClient.get("/auth/me");
        setUser(res.data.user);
      } catch (err) {
        clearAuthToken();
        setUser(null);
      }
      setLoadingUser(false);
    };

    initAuth();
  }, [location.pathname]);

  const handleLogin = (jwt, userInfo) => {
    setUser(userInfo);
    setAuthToken(jwt);
    navigate('/');
  };

  const handleLogout = useCallback(() => {
    setUser(null);
    clearAuthToken();
    apiClient.post("/auth/logout").catch(() => null).finally(() => navigate('/login'));
  }, [navigate]);

  const shouldNotify = useCallback((ticket, statusValue) => {
    const key = `${ticket.ticket_id}-${statusValue}`;
    const now = Date.now();
    const last = recentNotificationRef.current.get(key);
    if (last && now - last < 120000) {
      return false;
    }
    recentNotificationRef.current.set(key, now);
    if (recentNotificationRef.current.size > 200) {
      recentNotificationRef.current.clear();
    }
    return true;
  }, []);

  const pushToast = useCallback((notification) => {
    if (isNowInQuietHours(notificationPrefs)) return;
    setToasts((prev) => [...prev, notification]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== notification.id));
    }, 5000);
  }, [notificationPrefs]);

  const mapNotification = useCallback((item) => ({
    id: item.notification_id,
    ticketId: item.ticket_id,
    ticketNumber: item.ticket_number,
    title: item.ticket_title || item.title || "",
    message: item.message || "",
    type: item.type,
    createdAt: item.created_at,
    read: item.is_read,
  }), []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get("/notifications");
      const rows = res.data.data.notifications || [];
      const mapped = rows.map(mapNotification);
      const visible = mapped.filter((item) => {
        if (item.type === "broadcast") return notificationPrefs.broadcast_enabled;
        return notificationPrefs.ticket_updates_enabled;
      });
      setNotifications(visible);
    } catch (err) {
      // Silent fail
    }
  }, [mapNotification, notificationPrefs.broadcast_enabled, notificationPrefs.ticket_updates_enabled]);

  const fetchNotificationPreferences = useCallback(async () => {
    try {
      const res = await apiClient.get("/notifications/preferences");
      setNotificationPrefs({ ...defaultNotificationPrefs, ...(res.data?.data?.preferences || {}) });
    } catch (err) {
      setNotificationPrefs(defaultNotificationPrefs);
    }
  }, []);

  const isAssignedToUser = useCallback((ticket, currentUser) => {
    if (!currentUser?.user_id) return false;
    if (currentUser.role === "end_user") {
      return `${ticket?.user_id}` === `${currentUser.user_id}`;
    }
    if (!ticket?.assigned_to) return false;
    return `${ticket.assigned_to}` === `${currentUser.user_id}`;
  }, []);

  const addResolvedNotification = useCallback((ticket) => {
    if (!ticket) return;
    if (!isAssignedToUser(ticket, user)) return;
    const statusValue = ticket.status || "Resolved";
    if (!shouldNotify(ticket, statusValue)) return;
    const notification = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ticketId: ticket.ticket_id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      status: statusValue,
      createdAt: new Date().toISOString(),
      read: false,
    };
    pushToast(notification);
    fetchNotifications();
    if (
      !isNowInQuietHours(notificationPrefs) &&
      notificationPrefs.browser_push_enabled &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      const label = statusValue === "Closed" ? "Ticket closed" : "Ticket resolved";
      new Notification(label, {
        body: `${notification.ticketNumber || "Ticket"}: ${notification.title}`,
      });
    }
  }, [fetchNotifications, isAssignedToUser, notificationPrefs, pushToast, shouldNotify, user]);

  const handleResolvedTickets = useCallback((resolvedTickets) => {
    if (!Array.isArray(resolvedTickets)) return;
    resolvedTickets.forEach((ticket) => addResolvedNotification(ticket));
  }, [addResolvedNotification]);

  const handleNotificationToggle = () => {
    setIsNotificationsOpen((prev) => {
      const next = !prev;
      if (next) {
        apiClient.patch("/notifications/read-all").catch(() => null);
        setNotifications((items) =>
          items.map((item) => ({ ...item, read: true })),
        );
      }
      return next;
    });
  };

  const handleRequestBrowserPermission = async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
  };

  const handleNotificationClick = (notification) => {
    apiClient.patch(`/notifications/${notification.id}/read`).catch(() => null);
    setIsNotificationsOpen(false);
    setNotifications((items) =>
      items.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    );

    // If it's a broadcast or has no valid ticket ID, show a toast instead of navigating
    if (!notification.ticketId || notification.ticketId === 'null' || notification.type === 'broadcast') {
      pushToast({
        id: `info-${Date.now()}`,
        title: notification.title || "Notification",
        message: notification.message || notification.title,
      });
      return;
    }

    // Navigate to the most appropriate path based on user role
    const isStaff = ["it_agent", "it_manager", "system_admin"].includes(user?.role);
    const path = isStaff ? `/team-queue/${notification.ticketId}` : `/tickets/${notification.ticketId}`;
    navigate(path);
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!user) return;
    fetchNotificationPreferences();
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotificationPreferences, fetchNotifications, user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [fetchNotifications, notificationPrefs.ticket_updates_enabled, notificationPrefs.broadcast_enabled, user]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const handleTicketReopened = (payload) => {
      if (!payload?.ticket) return;
      const ticket = payload.ticket;

      const isRelevant =
        (user.role === 'end_user' && ticket.user_id === user.user_id) ||
        (['it_agent', 'it_manager', 'system_admin'].includes(user.role) &&
          (ticket.assigned_to === user.user_id || ticket.user_id === user.user_id));

      if (!isRelevant) return;

      const notification = {
        id: `reopened-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ticketId: ticket.ticket_id,
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        message: 'Ticket moved back to In Progress',
        type: 'ticket_updated',
        createdAt: new Date().toISOString(),
        read: false,
      };

      pushToast(notification);
      fetchNotifications();

      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification('Ticket updated', {
          body: `${ticket.ticket_number || 'Ticket'}: ${ticket.title}`,
          icon: '/favicon.ico',
        });
      }
    };

    socket.on('ticket-reopened', handleTicketReopened);
    return () => {
      socket.off('ticket-reopened', handleTicketReopened);
    };
  }, [fetchNotifications, notificationPrefs, pushToast, user]);

  if (loadingUser) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Initializing Madison88 ITSM...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="loading-screen"><div className="loader"></div><p>Loading Madison88 ITSM...</p></div>}>
      <Routes>
        <Route
          path="/login"
          element={
            !user ? (
              <LoginPage onLogin={handleLogin} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/signup"
          element={
            !user ? (
              <SignupPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/"
          element={
            user ? (
              <MainLayout
                user={user}
                notifications={notifications}
                unreadCount={unreadCount}
                onLogout={handleLogout}
                onNotificationToggle={handleNotificationToggle}
                isNotificationsOpen={isNotificationsOpen}
                onRequestBrowserPermission={handleRequestBrowserPermission}
                browserPermission={browserPermission}
                onNotificationClick={handleNotificationClick}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to={`/${user?.role || "end_user"}/dashboard`} replace />} />

          {/* Dashboard Routes */}
          <Route path="/end_user/dashboard" element={<UserDashboard user={user} />} />
          <Route path="/it_agent/dashboard" element={<AgentDashboard user={user} />} />
          <Route path="/it_manager/dashboard" element={<ManagerDashboard user={user} />} />
          <Route path="/system_admin/dashboard" element={<AdminDashboard user={user} />} />

          <Route path="/tickets/*" element={
            <Routes>
              <Route path="/" element={<TicketsLayout user={user} viewMode="my" refreshKey={refreshKey} setRefreshKey={setRefreshKey} onResolvedTickets={handleResolvedTickets} />} />
              <Route path=":ticketId" element={<TicketsLayout user={user} viewMode="my" refreshKey={refreshKey} setRefreshKey={setRefreshKey} onResolvedTickets={handleResolvedTickets} />} />
            </Routes>
          } />

          <Route path="/team-queue/*" element={
            <Routes>
              <Route path="/" element={<TicketsLayout user={user} viewMode="team" refreshKey={refreshKey} setRefreshKey={setRefreshKey} onResolvedTickets={handleResolvedTickets} />} />
              <Route path=":ticketId" element={<TicketsLayout user={user} viewMode="team" refreshKey={refreshKey} setRefreshKey={setRefreshKey} onResolvedTickets={handleResolvedTickets} />} />
            </Routes>
          } />

          <Route path="/new-ticket" element={
            <NewTicketPage user={user} onCreated={(ticket) => {
              setRefreshKey(p => p + 1);
              navigate(`/tickets/${ticket.ticket_id}`);
            }} />
          } />

          <Route path="/knowledge-base" element={<KnowledgeBasePage user={user} />} />
          <Route path="/kb-editor" element={<KnowledgeBaseEditor />} />
          <Route path="/advanced-reporting" element={<AdvancedReportingPage user={user} />} />
          <Route path="/ticket-templates" element={<TicketTemplatesPage />} />
          <Route path="/change-management" element={<ChangeManagementPage user={user} />} />
          <Route path="/asset-tracking" element={<AssetsPage user={user} />} />
          <Route path="/admin-users" element={<AdminUsersPage />} />
          <Route path="/sla-standards" element={<AdminSlaPage />} />
          <Route path="/kanban" element={<KanbanPage user={user} />} />
          <Route path="/profile" element={<ProfilePage user={user} onUserUpdate={(updated) => {
            setUser(updated);
          }} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>

      {toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="toast">
              <div>
                <strong>{toast.ticketNumber || "Ticket"}</strong>
                <span>{toast.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ErrorBoundary>
  );
}

export default App;
