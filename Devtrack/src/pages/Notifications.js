import {
  BarChart3,
  Bell,
  BellOff,
  Bug,
  Check,
  CheckCheck,
  CheckSquare,
  ChevronDown,
  Folder,
  Home,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import '../styles/Notifications.css';
import { clearLocalSession, readLocalSession } from '../utils/authStorage';
import {
  markAllUserNotificationsRead,
  markNotificationRead,
  readUserNotifications,
} from '../utils/notificationStorage';

const navigationItems = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Projects', icon: Folder, path: '/projects' },
  { label: 'My Tasks', icon: CheckSquare, path: '/tasks' },
  { label: 'Report', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const filters = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'project', label: 'Projects' },
  { value: 'bug', label: 'Bugs' },
  { value: 'team', label: 'Team' },
];

const notificationIcons = {
  project: Folder,
  bug: Bug,
  team: Users,
  comment: MessageCircle,
  system: Bell,
};

const getInitials = (name = 'DevTrack User') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

const formatNotificationDate = (notification) => {
  if (notification.time) return notification.time;
  if (!notification.createdAt) return '';

  return new Date(notification.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const Notifications = () => {
  const navigate = useNavigate();
  const session = readLocalSession();
  const [notifications, setNotifications] = useState(() => readUserNotifications(session?.id));
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const profileMenuRef = useRef(null);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const filteredNotifications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return notifications.filter((notification) => {
      const category = notification.category || notification.type || 'system';
      const matchesFilter = activeFilter === 'all'
        || (activeFilter === 'unread' && !notification.read)
        || category === activeFilter;
      const matchesSearch = !normalizedSearch
        || `${notification.message || ''} ${notification.detail || ''} ${category}`
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, notifications, searchTerm]);

  useEffect(() => {
    if (!profileOpen) return undefined;

    const closeProfile = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
    };

    document.addEventListener('pointerdown', closeProfile);
    return () => document.removeEventListener('pointerdown', closeProfile);
  }, [profileOpen]);

  useEffect(() => {
    if (!notice) return undefined;

    const dismissTimer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(dismissTimer);
  }, [notice]);

  const handleLogout = () => {
    clearLocalSession();
    navigate('/login', { replace: true });
  };

  const markAllRead = () => {
    setNotifications(markAllUserNotificationsRead(session.id));
  };

  const markRead = (notificationId) => {
    setNotifications(markNotificationRead(notificationId, session.id));
  };

  const clearFilters = () => {
    setActiveFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="dashboard-page notifications-page">
      <aside className="dashboard-sidebar">
        <button className="dashboard-brand" type="button" onClick={() => navigate('/')}>
          <span className="dashboard-brand-mark" aria-hidden="true"><Bug /></span>
          <span>Dev<span>Track</span></span>
        </button>

        <nav className="dashboard-navigation" aria-label="Application navigation">
          {navigationItems.map(({ label, icon: Icon, active, path }) => (
            <button
              className={active ? 'is-active' : ''}
              type="button"
              key={label}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (path) navigate(path);
                else if (!active) setNotice(`${label} will be connected in the next development phase.`);
              }}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <span className="sidebar-ring" aria-hidden="true">✳</span>
      </aside>

      <div className="dashboard-workspace">
        <header className="dashboard-topbar notifications-topbar">
          <label className="dashboard-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search notifications</span>
            <input
              type="search"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className="dashboard-account">
            <div className="account-menu-wrap" ref={profileMenuRef}>
              <button
                className="account-button"
                type="button"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((current) => !current)}
              >
                <span className="account-avatar">
                  {session?.profileImage
                    ? <img src={session.profileImage} alt="" />
                    : getInitials(session?.nickname || session?.fullName)}
                </span>
                <span className="account-name">{session?.nickname || session?.fullName}</span>
                <ChevronDown aria-hidden="true" />
              </button>
              {profileOpen && (
                <div className="account-dropdown">
                  <span>{session?.email}</span>
                  <button type="button" onClick={handleLogout}><LogOut /> Log Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {notice && (
          <div className="dashboard-notice" role="status" aria-live="polite" aria-atomic="true">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button>
          </div>
        )}

        <main className="notifications-content">
          <header className="notifications-heading">
            <h1>Notification center</h1>
            <button type="button" disabled={unreadCount === 0} onClick={markAllRead}>
              <CheckCheck /> Mark all as read
            </button>
          </header>

          <section className="notifications-panel" aria-labelledby="notification-list-title">
            <div className="notifications-toolbar">
              <div>
                <h2 id="notification-list-title">Your updates</h2>
                <span>{filteredNotifications.length} shown</span>
              </div>
              <div className="notification-filters" aria-label="Filter notifications">
                {filters.map((filter) => (
                  <button
                    className={activeFilter === filter.value ? 'is-active' : ''}
                    type="button"
                    key={filter.value}
                    aria-pressed={activeFilter === filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                  >
                    {filter.label}
                    {filter.value === 'unread' && unreadCount > 0 && <span>{unreadCount}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="notifications-list" aria-live="polite">
              {filteredNotifications.length > 0 ? filteredNotifications.map((notification) => {
                const category = notification.category || notification.type || 'system';
                const NotificationIcon = notificationIcons[category] || Bell;

                return (
                  <article className={notification.read ? '' : 'is-unread'} key={notification.id}>
                    <span className={`notifications-list-icon notification-icon-${category}`}>
                      <NotificationIcon aria-hidden="true" />
                    </span>
                    <div className="notifications-list-copy">
                      <span className="notification-category">{category}</span>
                      <strong>{notification.message}</strong>
                      {notification.detail && <p>{notification.detail}</p>}
                    </div>
                    <div className="notifications-list-meta">
                      <time>{formatNotificationDate(notification)}</time>
                      {!notification.read && (
                        <button type="button" onClick={() => markRead(notification.id)}>
                          <Check /> Mark as read
                        </button>
                      )}
                    </div>
                  </article>
                );
              }) : (
                <div className="notifications-page-empty">
                  <span><BellOff /></span>
                  <h2>{notifications.length === 0 ? 'No notifications yet' : 'No matching notifications'}</h2>
                  <p>
                    {notifications.length === 0
                      ? 'Updates about projects, bugs, comments, and your team will appear here.'
                      : 'Try selecting a different filter or clearing your search.'}
                  </p>
                  {(activeFilter !== 'all' || searchTerm) && (
                    <button type="button" onClick={clearFilters}>Clear filters</button>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Notifications;
