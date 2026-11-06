import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  BellOff,
  Bug,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  CircleCheckBig,
  Code2,
  Folder,
  Globe2,
  Home,
  LogOut,
  ListChecks,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Smartphone,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import { clearLocalSession, readLocalSession } from '../utils/authStorage';

const recentBugs = [];
const activeProjects = [];
const deadlines = [];
const initialTasks = [];

const navigationItems = [
  { label: 'Dashboard', icon: Home, active: true },
  { label: 'Projects', icon: Folder },
  { label: 'Bugs', icon: Bug },
  { label: 'My Tasks', icon: CheckSquare },
  { label: 'Report', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
];

const getInitials = (name = 'DevTrack User') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

const ProjectIcon = ({ type }) => {
  const icons = {
    web: <Folder />,
    mobile: <Smartphone />,
    api: <Code2 />,
    site: <Globe2 />,
  };

  return <span className={`project-icon project-icon-${type}`}>{icons[type]}</span>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const session = readLocalSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [notice, setNotice] = useState('');
  const notificationMenuRef = useRef(null);

  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!notificationMenuRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [notificationsOpen]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredBugs = useMemo(() => recentBugs.filter((bug) => (
    !normalizedSearch
    || `${bug.id} ${bug.title} ${bug.assignee} ${bug.status}`.toLowerCase().includes(normalizedSearch)
  )), [normalizedSearch]);
  const filteredProjects = useMemo(() => activeProjects.filter((project) => (
    !normalizedSearch || project.name.toLowerCase().includes(normalizedSearch)
  )), [normalizedSearch]);

  const showComingSoon = (feature) => {
    setNotice(`${feature} will be connected in the next development phase.`);
  };

  const toggleTask = (taskId) => {
    setCompletedTasks((current) => (
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    ));
  };

  const handleLogout = () => {
    clearLocalSession();
    navigate('/login', { replace: true });
  };

  const markAllNotificationsRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <button className="dashboard-brand" type="button" onClick={() => navigate('/')}>
          <span className="dashboard-brand-mark" aria-hidden="true"><Bug /></span>
          <span>Dev<span>Track</span></span>
        </button>

        <nav className="dashboard-navigation" aria-label="Dashboard navigation">
          {navigationItems.map(({ label, icon: Icon, active }) => (
            <button
              className={active ? 'is-active' : ''}
              type="button"
              key={label}
              onClick={() => active ? undefined : showComingSoon(label)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <span className="sidebar-ring" aria-hidden="true">✳</span>
      </aside>

      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <label className="dashboard-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search dashboard</span>
            <input
              type="search"
              placeholder="Search bugs, projects or team members..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className="dashboard-account">
            <div className="notification-menu-wrap" ref={notificationMenuRef}>
              <button
                className="notification-button"
                type="button"
                aria-label="View notifications"
                aria-expanded={notificationsOpen}
                aria-controls="notification-menu"
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setProfileOpen(false);
                }}
              >
                <Bell />
                {unreadNotificationCount > 0 && <span aria-hidden="true" />}
              </button>

              {notificationsOpen && (
                <section className="notification-dropdown" id="notification-menu" aria-label="Notifications menu">
                  <div className="notification-dropdown-header">
                    <h2>Notifications</h2>
                    <button
                      type="button"
                      disabled={unreadNotificationCount === 0}
                      onClick={markAllNotificationsRead}
                    >
                      <ListChecks /> Mark all as read
                    </button>
                  </div>

                  <div className="notification-list" aria-live="polite">
                    {notifications.length > 0 ? notifications.map((notification) => (
                      <article className={notification.read ? '' : 'is-unread'} key={notification.id}>
                        {!notification.read && <i aria-label="Unread notification" />}
                        <span className="notification-item-icon"><Bell /></span>
                        <div>
                          <strong>{notification.message}</strong>
                          {notification.detail && <p>{notification.detail}</p>}
                        </div>
                        <time>{notification.time}</time>
                      </article>
                    )) : (
                      <div className="notification-empty-state">
                        <span><BellOff /></span>
                        <strong>No notifications yet</strong>
                        <p>Updates about your projects, bugs, and team will appear here.</p>
                      </div>
                    )}
                  </div>

                  <button
                    className="notification-footer-button"
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      showComingSoon('All notifications');
                    }}
                  >
                    View all notifications <ArrowRight />
                  </button>
                </section>
              )}
            </div>
            <div className="account-menu-wrap">
              <button
                className="account-button"
                type="button"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((current) => !current);
                  setNotificationsOpen(false);
                }}
              >
                <span className="account-avatar">{getInitials(session?.fullName)}</span>
                <span className="account-name">{session?.fullName}</span>
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
          <button className="dashboard-notice" type="button" onClick={() => setNotice('')}>
            {notice}<span aria-hidden="true">×</span>
          </button>
        )}

        <div className="dashboard-body">
          <main className="dashboard-main-content">
            <section className="dashboard-intro">
              <div>
                <p>Welcome back</p>
                <h1>Dashboard</h1>
                <span>Here’s what’s happening with your projects today.</span>
              </div>
              <div className="dashboard-actions">
                <button className="primary-dashboard-action" type="button" onClick={() => showComingSoon('Create Bug')}>
                  <Plus /> Create Bug
                </button>
                <button type="button" onClick={() => showComingSoon('New Project')}>
                  <Folder /> New Project
                </button>
              </div>
            </section>

            <section className="metrics-grid" aria-label="Dashboard statistics">
              <article>
                <span className="metric-icon metric-icon-red"><Bug /></span>
                <div><p>Open Bugs</p><strong>0</strong></div>
              </article>
              <article>
                <span className="metric-icon metric-icon-orange"><RefreshCcw /></span>
                <div><p>In Progress</p><strong>0</strong></div>
              </article>
              <article>
                <span className="metric-icon metric-icon-green"><CircleCheckBig /></span>
                <div><p>Resolved</p><strong>0</strong></div>
              </article>
              <article>
                <span className="metric-icon metric-icon-gray"><Users /></span>
                <div><p>Team</p><strong>0</strong></div>
              </article>
            </section>

            <section className="dashboard-panel recent-bugs-panel">
              <div className="panel-heading">
                <h2>Recent Bugs</h2>
                <button type="button" onClick={() => showComingSoon('All bugs')}>View all <ArrowRight /></button>
              </div>
              <div className="dashboard-table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Assignee</th><th>Updated</th></tr></thead>
                  <tbody>
                    {filteredBugs.map((bug) => (
                      <tr key={bug.id}>
                        <td>{bug.id}</td>
                        <td>{bug.title}</td>
                        <td><span className={`table-pill priority-${bug.priority.toLowerCase()}`}>
                          {bug.priority === 'High' && <ArrowUp />}
                          {bug.priority === 'Low' && <ArrowDown />}
                          {bug.priority === 'Medium' && '−'} {bug.priority}
                        </span></td>
                        <td><span className={`table-pill status-${bug.status.toLowerCase().replace(' ', '-')}`}>{bug.status}</span></td>
                        <td><span className="assignee-cell"><i>{bug.initials}</i>{bug.assignee}</span></td>
                        <td>{bug.updated}</td>
                      </tr>
                    ))}
                    {filteredBugs.length === 0 && <tr><td colSpan="6" className="empty-table">No bugs match your search.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="dashboard-panel active-projects-panel">
              <div className="panel-heading">
                <h2>Active Projects</h2>
                <button type="button" onClick={() => showComingSoon('All projects')}>View all <ArrowRight /></button>
              </div>
              <div className="project-list">
                <div className="project-row project-row-head"><span>Project</span><span>Progress</span><span>Bugs</span><span>Due Date</span></div>
                {filteredProjects.map((project) => (
                  <div className="project-row" key={project.name}>
                    <span className="project-name"><ProjectIcon type={project.icon} />{project.name}</span>
                    <span className="project-progress"><i><b style={{ width: `${project.progress}%` }} /></i>{project.progress}%</span>
                    <span>{project.bugs}</span>
                    <span>{project.due}</span>
                  </div>
                ))}
                {filteredProjects.length === 0 && <p className="empty-projects">No projects match your search.</p>}
              </div>
            </section>
          </main>

          <aside className="dashboard-rail">
            <section className="rail-section sprint-section">
              <h2>Current Sprint</h2>
              <div className="empty-sprint">
                <span><RefreshCcw /></span>
                <strong>No active sprint</strong>
                <p>Create a project and start a sprint to see its progress here.</p>
              </div>
            </section>

            <section className="rail-section deadlines-section">
              <div className="rail-heading"><h2>Upcoming Deadlines</h2><button type="button" onClick={() => showComingSoon('All deadlines')}>View all <ArrowRight /></button></div>
              <div className="deadline-list">
                {deadlines.length > 0 ? deadlines.map((deadline) => (
                  <article key={deadline.title}>
                    <span className="deadline-icon"><CalendarDays /></span>
                    <div><strong>{deadline.title}</strong><span>{deadline.date}</span></div>
                    <i className={`deadline-days deadline-${deadline.tone}`}>{deadline.days}</i>
                  </article>
                )) : <p className="empty-rail-state">No upcoming deadlines.</p>}
              </div>
            </section>

            <section className="rail-section tasks-section">
              <div className="rail-heading"><h2>My Assigned Tasks</h2><button type="button" onClick={() => showComingSoon('All tasks')}>View all <ArrowRight /></button></div>
              <div className="task-list">
                {initialTasks.length > 0 ? initialTasks.map((task) => {
                  const completed = completedTasks.includes(task.id);
                  return (
                    <label className={completed ? 'is-completed' : ''} key={task.id}>
                      <input type="checkbox" checked={completed} onChange={() => toggleTask(task.id)} />
                      <span className="task-checkbox">{completed && <Check />}</span>
                      <span className="task-copy"><strong>{task.title}</strong><small>{task.id}</small></span>
                      <i className={`task-priority priority-${task.priority.toLowerCase()}`}>
                        {task.priority === 'High' && '▲ '}
                        {task.priority === 'Medium' && '− '}
                        {task.priority === 'Low' && '▼ '}
                        {task.priority}
                      </i>
                    </label>
                  );
                }) : <p className="empty-rail-state">No tasks assigned to you.</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
