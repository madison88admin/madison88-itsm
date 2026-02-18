import React, { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import brandLogo from "./assets/Madison-88-Logo-250.png";
import apiClient from "./api/client";
import { getSocket } from "./api/socket";
import LoginPage from "./pages/LoginPage";
import TicketsPage from "./pages/TicketsPage";
import NewTicketPage from "./pages/NewTicketPage";
import TicketDetailPage from "./pages/TicketDetailPage";
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

function App() {
  const { logout: auth0Logout } = useAuth0();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [viewMode, setViewMode] = useState("my");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const recentNotificationRef = useRef(new Map());

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  useEffect(() => {
    if (user?.role && user.role !== "end_user" && activeTab === "new") {
      setActiveTab("tickets");
    }
  }, [user, activeTab]);

  const handleLogin = (jwt, userInfo) => {
    setToken(jwt);
    setUser(userInfo);
    localStorage.setItem("token", jwt);
    localStorage.setItem("user", JSON.stringify(userInfo));
  };

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
      // Silent fail to avoid blocking UI.
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

  const isAgent = user?.role === "it_agent";
  const isManager = user?.role === "it_manager";
  const isAdmin = user?.role === "system_admin";

  const roleClass = user?.role ? `role-${user.role}` : "";

  const navItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "tickets", label: isAgent ? "Assigned Tickets" : "Tickets" },
    ...(isManager || isAdmin ? [{ key: "team", label: "Team Queue" }] : []),
    ...(user?.role === "end_user" ? [{ key: "new", label: "New Ticket" }] : []),
    { key: "kb", label: "Knowledge Base" },
    ...(isManager || isAdmin ? [{ key: "kb-editor", label: "KB Editor" }] : []),
    ...(isManager || isAdmin
      ? [{ key: "advanced-reporting", label: "Advanced Reporting" }]
      : []),
    ...(isManager || isAdmin
      ? [{ key: "ticket-templates", label: "Ticket Templates" }]
      : []),
    ...(isManager || isAdmin
      ? [{ key: "changes", label: "Change Management" }]
      : []),
    ...(isAgent || isManager || isAdmin
      ? [{ key: "assets", label: "Asset Tracking" }]
      : []),
    ...(isAdmin ? [{ key: "admin-users", label: "User Management" }] : []),
    ...(isAdmin ? [{ key: "sla-standards", label: "SLA Standards" }] : []),
  ];

  const renderDashboard = () => {
    if (isAdmin) return <AdminDashboard />;
    if (isManager) return <ManagerDashboard />;
    if (isAgent) return <AgentDashboard />;
    return <UserDashboard />;
  };

  const headerTitle = {
    dashboard: "Dashboard",
    tickets: "Tickets",
    team: "Team Queue",
    new: "Create Ticket",
    kb: "Knowledge Base",
    "kb-editor": "KB Editor",
    "advanced-reporting": "Advanced Reporting",
    "ticket-templates": "Ticket Templates",
    changes: "Change Management",
    assets: "Asset Tracking",
    "admin-users": "User Management",
    "sla-standards": "SLA Standards",
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!token) return;
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [token, user?.user_id]);

  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket();
    if (!socket) return;

    const handleTicketReopened = (payload) => {
      if (!payload?.ticket) return;
      const ticket = payload.ticket;
      
      // Only notify if user is assigned to or created the ticket
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
  }, [token, user]);

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

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
    apiClient
      .patch(`/notifications/${notification.id}/read`)
      .catch(() => null);
    setActiveTab("tickets");
    setSelectedTicketId(notification.ticketId);
    setIsNotificationsOpen(false);
    setNotifications((items) =>
      items.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    );
  };

  return (
    <div className={`app-shell ${roleClass}`}>
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <img
            className="brand-logo"
            src={brandLogo}
            alt="Madison88"
          />
          <div>
            <h1>Madison88 ITSM</h1>
            <p>Service Desk</p>
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={
                activeTab === item.key ? "nav-item active" : "nav-item"
              }
              onClick={() => {
                setActiveTab(item.key);
                setIsSidebarOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <div>
              <strong>{user?.full_name || "User"}</strong>
              <span className="role-pill">{user?.role}</span>
            </div>
          </div>
          <button
            className="btn ghost"
            onClick={() => {
              setToken("");
              setUser(null);
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              // Also logout from Auth0
              auth0Logout({ logoutParams: { returnTo: window.location.origin } });
            }}
          >
            Logout
          </button>
        </div>
      </aside>
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      <main className="content">
        <header className="topbar">
          <div>
            <h2>{headerTitle[activeTab] || "Dashboard"}</h2>
            <p>Prioritize, track, and resolve requests across regions.</p>
          </div>
          <div className="topbar-actions">
            <button
              className="notification-button"
              onClick={handleNotificationToggle}
              aria-label="Notifications"
            >
              <svg
                viewBox="0 0 24 24"
                role="img"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 22a2.5 2.5 0 0 0 2.4-1.8h-4.8A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z" />
              </svg>
              {unreadCount > 0 && (
                <span className="notification-count">{unreadCount}</span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="notification-popover">
                <div className="notification-header">Notifications</div>
                {typeof Notification !== "undefined" &&
                  browserPermission !== "granted" && (
                    <div className="notification-permission">
                      <p className="muted">
                        Enable browser notifications for resolved tickets.
                      </p>
                      <button
                        className="btn ghost small"
                        onClick={handleRequestBrowserPermission}
                      >
                        Enable notifications
                      </button>
                    </div>
                  )}
                {notifications.length === 0 ? (
                  <p className="muted">No notifications yet.</p>
                ) : (
                  <div className="notification-list">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        className="notification-item"
                        onClick={() => handleNotificationClick(item)}
                      >
                        <div>
                          <strong>
                            {item.ticketNumber || "Ticket"}
                          </strong>
                          <span>{item.message || item.title}</span>
                        </div>
                        <time>
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </time>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        {activeTab === "dashboard" && renderDashboard()}
        {(activeTab === "tickets" || activeTab === "team") && (
          <div className="tickets-layout">
            <TicketsPage
              refreshKey={refreshKey}
              user={user}
              viewMode={activeTab === "team" ? "team" : viewMode}
              onViewModeChange={setViewMode}
              selectedId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
              onResolvedTickets={handleResolvedTickets}
            />
            <TicketDetailPage
              ticketId={selectedTicketId}
              user={user}
              onClose={() => setSelectedTicketId(null)}
              onUpdated={() => setRefreshKey((prev) => prev + 1)}
              onResolved={addResolvedNotification}
            />
          </div>
        )}
        {activeTab === "new" && (
          <NewTicketPage
            onCreated={(ticket) => {
              setActiveTab("tickets");
              setSelectedTicketId(ticket.ticket_id);
              setRefreshKey((prev) => prev + 1);
            }}
          />
        )}
        {activeTab === "kb" && <KnowledgeBasePage user={user} />}
        {activeTab === "kb-editor" && (isManager || isAdmin) && (
          <KnowledgeBaseEditor />
        )}
        {activeTab === "advanced-reporting" && <AdvancedReportingPage />}
        {activeTab === "ticket-templates" && <TicketTemplatesPage />}
        {activeTab === "changes" && <ChangeManagementPage user={user} />}
        {activeTab === "assets" && <AssetsPage user={user} />}
        {activeTab === "admin-users" && <AdminUsersPage />}
        {activeTab === "sla-standards" && <AdminSlaPage />}
        {toasts.length > 0 && (
          <div className="toast-stack" aria-live="polite">
            {toasts.map((toast) => (
              <div key={toast.id} className="toast">
                <div>
                  <strong>
                    {toast.ticketNumber || "Ticket"}
                  </strong>
                  <span>{toast.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
