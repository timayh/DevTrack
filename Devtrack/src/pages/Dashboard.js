import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  BellOff,
  Bug,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CircleAlert,
  CircleCheckBig,
  Code2,
  Folder,
  Globe2,
  Home,
  LogOut,
  ListChecks,
  Minus,
  Plus,
  RefreshCcw,
  Search,
  ServerCog,
  Settings,
  Shapes,
  Smartphone,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BugDetailsModal from '../components/BugDetailsModal';
import CreateBugModal from '../components/CreateBugModal';
import CreateProjectModal from '../components/CreateProjectModal';
import DeadlinesModal from '../components/DeadlinesModal';
import '../styles/Dashboard.css';
import { clearLocalSession, readLocalSession } from '../utils/authStorage';
import { readStoredBugs } from '../utils/bugStorage';
import {
  markAllUserNotificationsRead,
  NOTIFICATIONS_UPDATED_EVENT,
  readUserNotifications,
} from '../utils/notificationStorage';
import { readStoredProjects } from '../utils/projectStorage';

const navigationItems = [
  { label: 'Dashboard', icon: Home, path: '/dashboard', active: true },
  { label: 'Projects', icon: Folder, path: '/projects' },
  { label: 'My Tasks', icon: CheckSquare, path: '/tasks' },
  { label: 'Report', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const getInitials = (name = 'DevTrack User') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

const formatProjectDate = (date) => {
  if (!date) return 'No due date';

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatBugUpdated = (timestamp) => {
  const updatedAt = new Date(timestamp).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - updatedAt) / 60000));

  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min${elapsedMinutes === 1 ? '' : 's'} ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
};

const formatNotificationTime = (notification) => {
  if (notification.time) return notification.time;
  if (!notification.createdAt) return '';

  return new Date(notification.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const projectIconTypes = [
  'software-development',
  'mobile-application',
  'api-service',
  'website',
  'other',
];

const getProjectIconType = (type) => (
  projectIconTypes.includes(type) ? type : 'other'
);

const getDeadlineDetails = (endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${endDate}T00:00:00`);
  const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);

  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft);
    return {
      days: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`,
      tone: 'urgent',
    };
  }

  return {
    days: daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    tone: daysLeft <= 5 ? 'urgent' : daysLeft <= 10 ? 'warning' : 'muted',
  };
};

const getSprintDaysLabel = (endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${endDate}T00:00:00`);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);

  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return 'Ends today';
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
};

const ProjectIcon = ({ type }) => {
  const icons = {
    'software-development': <Code2 />,
    'mobile-application': <Smartphone />,
    'api-service': <ServerCog />,
    website: <Globe2 />,
    other: <Shapes />,
  };

  return <span className={`project-icon project-icon-${type}`}>{icons[type] || icons.other}</span>;
};

const BugPriorityIcon = ({ priority }) => {
  const icons = {
    Critical: CircleAlert,
    High: ArrowUp,
    Medium: Minus,
    Low: ArrowDown,
  };
  const Icon = icons[priority] || CircleAlert;

  return <Icon aria-hidden="true" />;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const session = readLocalSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => readUserNotifications(session?.id));
  const [notice, setNotice] = useState('');
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [deadlinesModalOpen, setDeadlinesModalOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [projects, setProjects] = useState(() => readStoredProjects().filter((project) => (
    project.ownerId === session?.id || project.teamMemberIds?.includes(session?.id)
  )));
  const [bugs, setBugs] = useState(() => {
    const availableProjectIds = new Set(projects.map((project) => project.id));
    return readStoredBugs().filter((bug) => availableProjectIds.has(bug.projectId));
  });
  const notificationMenuRef = useRef(null);

  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;
  const openBugCount = bugs.filter((bug) => ['New', 'Assigned', 'Reopened'].includes(bug.status)).length;
  const inProgressBugCount = bugs.filter((bug) => bug.status === 'In Progress').length;
  const resolvedBugCount = bugs.filter((bug) => bug.status === 'Closed').length;
  const recentBugs = useMemo(() => [...bugs]
    .sort((first, second) => (
      new Date(second.updatedAt || second.createdAt).getTime()
      - new Date(first.updatedAt || first.createdAt).getTime()
    ))
    .slice(0, 5)
    .map((bug) => ({
      ...bug,
      assignee: bug.assigneeName || 'Unassigned',
      initials: bug.assigneeName ? getInitials(bug.assigneeName) : '—',
      updated: formatBugUpdated(bug.updatedAt || bug.createdAt),
    })), [bugs]);
  const activeProjects = useMemo(() => projects
    .filter((project) => project.status === 'active')
    .map((project) => ({
      ...project,
      progress: project.progress ?? 0,
      bugs: bugs.filter((bug) => bug.projectId === project.id).length,
      due: formatProjectDate(project.endDate),
      icon: getProjectIconType(project.type),
    })), [bugs, projects]);
  const deadlines = useMemo(() => {
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const projectDeadlines = projects
      .filter((project) => project.endDate && project.status !== 'completed')
      .map((project) => ({
        id: `project-${project.id}`,
        type: 'project',
        projectId: project.id,
        title: project.name,
        subtitle: `${project.key} · Project milestone`,
        dueDate: project.endDate,
      }));
    const bugDeadlines = bugs
      .filter((bug) => bug.dueDate && bug.status !== 'Closed')
      .map((bug) => ({
        id: `bug-${bug.storageId || bug.id}`,
        type: 'bug',
        projectId: bug.projectId,
        bug,
        title: bug.title,
        subtitle: `${bug.id} · ${projectById.get(bug.projectId)?.name || bug.projectName || 'Unknown project'}`,
        dueDate: bug.dueDate,
      }));

    return [...projectDeadlines, ...bugDeadlines]
      .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
      .map((deadline) => ({
        ...deadline,
        date: formatProjectDate(deadline.dueDate),
        ...getDeadlineDetails(deadline.dueDate),
      }));
  }, [bugs, projects]);
  const previewDeadlines = deadlines.slice(0, 3);
  const assignedTasks = useMemo(() => [...bugs]
    .filter((bug) => bug.assigneeId === session?.id)
    .sort((first, second) => {
      const firstClosed = first.status === 'Closed' ? 1 : 0;
      const secondClosed = second.status === 'Closed' ? 1 : 0;
      if (firstClosed !== secondClosed) return firstClosed - secondClosed;

      return new Date(second.updatedAt || second.createdAt).getTime()
        - new Date(first.updatedAt || first.createdAt).getTime();
    })
    .slice(0, 4), [bugs, session?.id]);
  const currentSprint = useMemo(() => {
    const activeSprints = projects.flatMap((project) => {
      const sprint = project.sprints?.find((item) => (
        item.id === project.activeSprintId && item.status === 'active'
      ));
      return sprint ? [{ ...sprint, projectId: project.id, projectName: project.name }] : [];
    }).sort((first, second) => first.endDate.localeCompare(second.endDate));

    if (activeSprints.length === 0) return null;

    const sprint = activeSprints[0];
    const sprintBugs = bugs.filter((bug) => bug.projectId === sprint.projectId);
    const open = sprintBugs.filter((bug) => ['New', 'Assigned', 'Reopened'].includes(bug.status)).length;
    const inProgress = sprintBugs.filter((bug) => bug.status === 'In Progress').length;
    const resolved = sprintBugs.filter((bug) => bug.status === 'Closed').length;
    const progress = sprintBugs.length > 0 ? Math.round((resolved / sprintBugs.length) * 100) : 0;

    return {
      ...sprint,
      open,
      inProgress,
      resolved,
      progress,
      daysLabel: getSprintDaysLabel(sprint.endDate),
    };
  }, [bugs, projects]);
  const teamCount = useMemo(() => {
    const memberIds = new Set();

    projects.forEach((project) => {
      if (project.ownerId) memberIds.add(project.ownerId);
      project.teamMemberIds?.forEach((memberId) => memberIds.add(memberId));
    });

    return memberIds.size;
  }, [projects]);

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

  useEffect(() => {
    const refreshNotifications = () => {
      setNotifications(readUserNotifications(session?.id));
    };

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
  }, [session?.id]);

  useEffect(() => {
    if (!notice) return undefined;

    const dismissTimer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(dismissTimer);
  }, [notice]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredBugs = useMemo(() => recentBugs.filter((bug) => (
    !normalizedSearch
    || `${bug.id} ${bug.title} ${bug.assignee} ${bug.status}`.toLowerCase().includes(normalizedSearch)
  )), [normalizedSearch, recentBugs]);
  const filteredProjects = useMemo(() => activeProjects.filter((project) => (
    !normalizedSearch || `${project.name} ${project.key}`.toLowerCase().includes(normalizedSearch)
  )), [activeProjects, normalizedSearch]);

  const showComingSoon = (feature) => {
    setNotice(`${feature} will be connected in the next development phase.`);
  };

  const handleLogout = () => {
    clearLocalSession();
    navigate('/login', { replace: true });
  };

  const markAllNotificationsRead = () => {
    setNotifications(markAllUserNotificationsRead(session.id));
  };

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <button className="dashboard-brand" type="button" onClick={() => navigate('/')}>
          <span className="dashboard-brand-mark" aria-hidden="true"><Bug /></span>
          <span>Dev<span>Track</span></span>
        </button>

        <nav className="dashboard-navigation" aria-label="Dashboard navigation">
          {navigationItems.map(({ label, icon: Icon, active, path }) => (
            <button
              className={active ? 'is-active' : ''}
              type="button"
              key={label}
              onClick={() => {
                if (path && !active) navigate(path);
                else if (!active) showComingSoon(label);
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
                        <time>{formatNotificationTime(notification)}</time>
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
                      navigate('/notifications');
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

        <div className="dashboard-body">
          <main className="dashboard-main-content">
            <section className="dashboard-intro">
              <div>
                <p>Welcome back</p>
                <h1>Dashboard</h1>
                <span>Here’s what’s happening with your projects today.</span>
              </div>
              <div className="dashboard-actions">
                <button
                  className="primary-dashboard-action"
                  type="button"
                  onClick={() => {
                    setNotice('');
                    setBugModalOpen(true);
                  }}
                >
                  <Plus /> Create Bug
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotice('');
                    setProjectModalOpen(true);
                  }}
                >
                  <Folder /> New Project
                </button>
              </div>
            </section>

            <section className="metrics-grid" aria-label="Dashboard statistics">
              <article>
                <span className="metric-icon metric-icon-red"><Bug /></span>
                <div><p>Open Bugs</p><strong>{openBugCount}</strong></div>
              </article>
              <article>
                <span className="metric-icon metric-icon-orange"><RefreshCcw /></span>
                <div><p>In Progress</p><strong>{inProgressBugCount}</strong></div>
              </article>
              <article>
                <span className="metric-icon metric-icon-green"><CircleCheckBig /></span>
                <div><p>Resolved</p><strong>{resolvedBugCount}</strong></div>
              </article>
              <article>
                <span className="metric-icon metric-icon-gray"><Users /></span>
                <div><p>Team</p><strong>{teamCount}</strong></div>
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
                      <tr
                        className="dashboard-bug-row"
                        key={bug.storageId || bug.id}
                        onClick={() => setSelectedBug(bug)}
                      >
                        <td>{bug.id}</td>
                        <td>
                          <button
                            className="dashboard-bug-title"
                            type="button"
                            aria-label={`Open bug ${bug.id}: ${bug.title}`}
                            onClick={() => setSelectedBug(bug)}
                          >
                            {bug.title}
                          </button>
                        </td>
                        <td><span className={`table-pill priority-${bug.priority.toLowerCase()}`}>
                          <BugPriorityIcon priority={bug.priority} /> {bug.priority}
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
                <button type="button" onClick={() => navigate('/projects')}>View all <ArrowRight /></button>
              </div>
              <div className="project-list">
                <div className="project-row project-row-head"><span>Project</span><span>Progress</span><span>Bugs</span><span>Due Date</span></div>
                {filteredProjects.map((project) => (
                  <Link
                    className="project-row project-row-link"
                    key={project.id}
                    to={`/projects/${project.id}`}
                    aria-label={`Open project ${project.name}`}
                  >
                    <span className="project-name"><ProjectIcon type={project.icon} />{project.name}</span>
                    <span className="project-progress"><i><b style={{ width: `${project.progress}%` }} /></i>{project.progress}%</span>
                    <span>{project.bugs}</span>
                    <span>{project.due}</span>
                  </Link>
                ))}
                {filteredProjects.length === 0 && <p className="empty-projects">No projects match your search.</p>}
              </div>
            </section>
          </main>

          <aside className="dashboard-rail">
            <section className="rail-section sprint-section">
              <h2>Current Sprint</h2>
              {currentSprint ? (
                <>
                  <div className="sprint-title">
                    <strong>{currentSprint.name}</strong>
                    <span>{currentSprint.daysLabel}</span>
                  </div>
                  <p>
                    {currentSprint.projectName} · {formatProjectDate(currentSprint.startDate)} – {formatProjectDate(currentSprint.endDate)}
                  </p>
                  <div className="sprint-progress">
                    <i><b style={{ width: `${currentSprint.progress}%` }} /></i>
                    <span>{currentSprint.progress}%</span>
                  </div>
                  <div className="sprint-stats">
                    <div><strong>{currentSprint.open}</strong><span>Open</span></div>
                    <div><strong>{currentSprint.inProgress}</strong><span>In Progress</span></div>
                    <div><strong>{currentSprint.resolved}</strong><span>Resolved</span></div>
                  </div>
                </>
              ) : (
                <div className="empty-sprint">
                  <span><RefreshCcw /></span>
                  <strong>No active sprint</strong>
                  <p>Create a project and start a sprint to see its progress here.</p>
                </div>
              )}
            </section>

            <section className="rail-section deadlines-section">
              <div className="rail-heading"><h2>Upcoming Deadlines</h2><button type="button" onClick={() => setDeadlinesModalOpen(true)}>View all <ArrowRight /></button></div>
              <div className="deadline-list">
                {previewDeadlines.length > 0 ? previewDeadlines.map((deadline) => (
                  <article key={deadline.id}>
                    <span className={`deadline-icon deadline-icon-${deadline.type}`}>
                      {deadline.type === 'bug' ? <Bug /> : <CalendarDays />}
                    </span>
                    <div><strong>{deadline.title}</strong><span>{deadline.date}</span></div>
                    <i className={`deadline-days deadline-${deadline.tone}`}>{deadline.days}</i>
                  </article>
                )) : <p className="empty-rail-state">No upcoming deadlines.</p>}
              </div>
            </section>

            <section className="rail-section tasks-section">
              <div className="rail-heading"><h2>My Assigned Tasks</h2><button type="button" onClick={() => navigate('/tasks')}>View all <ArrowRight /></button></div>
              <div className="task-list">
                {assignedTasks.length > 0 ? assignedTasks.map((task) => (
                  <button
                    className="dashboard-task-row"
                    type="button"
                    key={task.storageId || task.id}
                    aria-label={`Open assigned task ${task.id}: ${task.title}`}
                    onClick={() => setSelectedBug(task)}
                  >
                    <span className={`task-status-icon status-${(task.status || 'New').toLowerCase().replaceAll(' ', '-')}`}>
                      {task.status === 'Closed' ? <CircleCheckBig /> : <Bug />}
                    </span>
                    <span className="task-copy"><strong>{task.title}</strong><small>{task.id} · {task.status || 'New'}</small></span>
                    <i className={`task-priority priority-${(task.priority || 'High').toLowerCase()}`}>
                      <BugPriorityIcon priority={task.priority || 'High'} /> {task.priority || 'High'}
                    </i>
                  </button>
                )) : <p className="empty-rail-state">No tasks assigned to you.</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {deadlinesModalOpen && (
        <DeadlinesModal
          deadlines={deadlines}
          onClose={() => setDeadlinesModalOpen(false)}
          onOpenDeadline={(deadline) => {
            setDeadlinesModalOpen(false);
            if (deadline.type === 'bug') {
              setSelectedBug(deadline.bug);
            } else {
              navigate(`/projects/${deadline.projectId}`);
            }
          }}
        />
      )}

      {bugModalOpen && (
        <CreateBugModal
          currentUser={session}
          projects={projects}
          onClose={() => setBugModalOpen(false)}
          onBugCreated={(bug) => {
            setBugs((current) => [...current, bug]);
            setBugModalOpen(false);
            setNotice(`${bug.id} was created successfully.`);
          }}
        />
      )}

      {projectModalOpen && (
        <CreateProjectModal
          currentUser={session}
          existingProjects={projects}
          onClose={() => setProjectModalOpen(false)}
          onProjectCreated={(project) => {
            setProjects((current) => [...current, project]);
            setProjectModalOpen(false);
            setNotice(`${project.name} was created successfully.`);
          }}
        />
      )}

      {selectedBug && (
        <BugDetailsModal
          bug={selectedBug}
          currentUser={session}
          canEditWorkflow={(
            selectedBug.assigneeId === session.id
            || projects.some((project) => (
              project.id === selectedBug.projectId && project.ownerId === session.id
            ))
          )}
          canDelete={(
            selectedBug.reporterId === session.id
            || projects.some((project) => (
              project.id === selectedBug.projectId && project.ownerId === session.id
            ))
          )}
          onClose={() => setSelectedBug(null)}
          onBugUpdated={(updatedBug) => {
            setBugs((current) => current.map((bug) => (
              (bug.storageId || bug.id) === (updatedBug.storageId || updatedBug.id) ? updatedBug : bug
            )));
            setSelectedBug(updatedBug);
          }}
          onBugDeleted={(deletedBug) => {
            setBugs((current) => current.filter((bug) => (
              (bug.storageId || bug.id) !== (deletedBug.storageId || deletedBug.id)
            )));
            setSelectedBug(null);
            setNotice(`${deletedBug.id} was deleted.`);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
