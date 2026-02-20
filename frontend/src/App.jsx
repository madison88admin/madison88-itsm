import React, { useEffect, useRef, useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import apiClient from "./api/client";
import { getSocket } from "./api/socket";

// Layouts & Pages
import MainLayout from "./components/layout/MainLayout";
import TicketsLayout from "./components/layout/TicketsLayout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import NewTicketPage from "./pages/NewTicketPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import KnowledgeBaseEditor from "./pages/KnowledgeBaseEditor";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminSlaPage from "./pages/AdminSlaPage";
import ChangeManagementPage from "./pages/ChangeManagementPage";
import AssetsPage from "./pages/AssetsPage";
import AdvancedReportingPage from "./pages/AdvancedReportingPage";
import TicketTemplatesPage from "./pages/TicketTemplatesPage";
import UserDashboard from "./pages/dashboards/UserDashboard";
import AgentDashboard from "./pages/dashboards/AgentDashboard";
import ManagerDashboard from "./pages/dashboards/ManagerDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import KanbanPage from "./pages/KanbanPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const recentNotificationRef = useRef(new Map());
  const navigate = useNavigate();
  const location = useLocation();

  // Load user and verify session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");

      if (storedToken) {
        try {
          // Verify token and get fresh user data
          apiClient.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
          const res = await apiClient.get("/auth/me");
          const freshUser = res.data.user;
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        } catch (err) {
          console.error("Session verification failed:", err);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          delete apiClient.defaults.headers.common["Authorization"];
          setUser(null);
        }
      } else if (storedUser) {
        // Fallback if token is missing but user is there (shouldn't happen with clean logic but for safety)
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem("user");
        }
      }
      setLoadingUser(false);
    };

    initAuth();
  }, []);

  const handleLogin = (jwt, userInfo) => {
    setUser(userInfo);
    localStorage.setItem("token", jwt);
    localStorage.setItem("user", JSON.stringify(userInfo));
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${jwt}`;
    navigate('/');
  };

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete apiClient.defaults.headers.common["Authorization"];
    navigate('/login');
  }, [navigate]);

  const shouldNotify = (ticket, statusValue) => {
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
  };

  const pushToast = (notification) => {
    setToasts((prev) => [...prev, notification]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== notification.id));
    }, 5000);
  };

  const mapNotification = (item) => ({
    id: item.notification_id,
    ticketId: item.ticket_id,
    ticketNumber: item.ticket_number,
    title: item.ticket_title || item.title || "",
    message: item.message || "",
    type: item.type,
    createdAt: item.created_at,
    read: item.is_read,
  });

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get("/notifications");
      const rows = res.data.data.notifications || [];
      setNotifications(rows.map(mapNotification));
    } catch (err) {
      // Silent fail
    }
  };

  const isAssignedToUser = (ticket, currentUser) => {
    if (!currentUser?.user_id) return false;
    if (currentUser.role === "end_user") {
      return `${ticket?.user_id}` === `${currentUser.user_id}`;
    }
    if (!ticket?.assigned_to) return false;
    return `${ticket.assigned_to}` === `${currentUser.user_id}`;
  };

  const addResolvedNotification = (ticket) => {
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
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      const label = statusValue === "Closed" ? "Ticket closed" : "Ticket resolved";
      new Notification(label, {
        body: `${notification.ticketNumber || "Ticket"}: ${notification.title}`,
      });
    }
  };

  const handleResolvedTickets = (resolvedTickets) => {
    if (!Array.isArray(resolvedTickets)) return;
    resolvedTickets.forEach((ticket) => addResolvedNotification(ticket));
  };

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
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

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
        message: 'Ticket has been reopened',
        type: 'ticket_reopened',
        createdAt: new Date().toISOString(),
        read: false,
      };

      pushToast(notification);
      fetchNotifications();

      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification('Ticket Reopened', {
          body: `${ticket.ticket_number || 'Ticket'}: ${ticket.title}`,
          icon: '/favicon.ico',
        });
      }
    };

    socket.on('ticket-reopened', handleTicketReopened);
    return () => {
      socket.off('ticket-reopened', handleTicketReopened);
    };
  }, [user]);

  if (loadingUser) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Initializing Madison88 ITSM...</p>
      </div>
    );
  }

  return (
    <>
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
          <Route path="/advanced-reporting" element={<AdvancedReportingPage />} />
          <Route path="/ticket-templates" element={<TicketTemplatesPage />} />
          <Route path="/change-management" element={<ChangeManagementPage user={user} />} />
          <Route path="/asset-tracking" element={<AssetsPage user={user} />} />
          <Route path="/admin-users" element={<AdminUsersPage />} />
          <Route path="/sla-standards" element={<AdminSlaPage />} />
          <Route path="/kanban" element={<KanbanPage user={user} />} />
          <Route path="/profile" element={<ProfilePage user={user} onUserUpdate={(updated) => {
            setUser(updated);
            localStorage.setItem("user", JSON.stringify(updated));
          }} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

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
    </>
  );
}

export default App;
