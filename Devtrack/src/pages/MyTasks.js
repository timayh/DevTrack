import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bug,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CircleAlert,
  Folder,
  Home,
  ListChecks,
  LogOut,
  Minus,
  Search,
  Settings,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BugDetailsModal from '../components/BugDetailsModal';
import '../styles/Dashboard.css';
import '../styles/MyTasks.css';
import { clearLocalSession, readLocalSession } from '../utils/authStorage';
import { readStoredBugs } from '../utils/bugStorage';
import { readStoredProjects } from '../utils/projectStorage';

const navigationItems = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Projects', icon: Folder, path: '/projects' },
  { label: 'My Tasks', icon: CheckSquare, path: '/tasks', active: true },
  { label: 'Report', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const taskFilters = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
];

const priorityIcons = {
  Critical: CircleAlert,
  High: ArrowUp,
  Medium: Minus,
  Low: ArrowDown,
};

const getInitials = (name = 'DevTrack User') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

const formatDate = (date) => {
  if (!date) return 'No due date';

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const matchesTaskFilter = (bug, filter) => {
  if (filter === 'all') return true;
  if (filter === 'open') return ['New', 'Assigned', 'Reopened'].includes(bug.status);
  if (filter === 'in-progress') return bug.status === 'In Progress';
  return bug.status === 'Closed';
};

const MyTasks = () => {
  const navigate = useNavigate();
  const session = readLocalSession();
  const [tasks, setTasks] = useState(() => readStoredBugs().filter((bug) => (
    bug.assigneeId === session?.id
  )));
  const [projects] = useState(() => readStoredProjects());
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [notice, setNotice] = useState('');
  const profileMenuRef = useRef(null);

  const projectById = useMemo(() => new Map(projects.map((project) => (
    [project.id, project]
  ))), [projects]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...tasks]
      .filter((task) => matchesTaskFilter(task, activeFilter))
      .filter((task) => {
        const project = projectById.get(task.projectId);
        return !normalizedSearch
          || `${task.id} ${task.title} ${task.description || ''} ${task.priority || ''} ${task.status || ''} ${project?.name || task.projectName || ''}`
            .toLowerCase()
            .includes(normalizedSearch);
      })
      .sort((first, second) => (
        new Date(second.updatedAt || second.createdAt).getTime()
        - new Date(first.updatedAt || first.createdAt).getTime()
      ));
  }, [activeFilter, projectById, searchTerm, tasks]);

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

  const clearFilters = () => {
    setActiveFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="dashboard-page tasks-page">
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
                if (path && !active) navigate(path);
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
        <header className="dashboard-topbar tasks-topbar">
          <label className="dashboard-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search assigned tasks</span>
            <input
              type="search"
              placeholder="Search assigned tasks..."
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

        <main className="tasks-content">
          <header className="tasks-heading">
            <h1>My tasks</h1>
          </header>

          <section className="tasks-panel" aria-labelledby="assigned-task-list-title">
            <div className="tasks-toolbar">
              <div>
                <h2 id="assigned-task-list-title">Assigned to you</h2>
                <span>{filteredTasks.length} shown</span>
              </div>
              <div className="task-page-filters" aria-label="Filter assigned tasks">
                {taskFilters.map((filter) => (
                  <button
                    className={activeFilter === filter.value ? 'is-active' : ''}
                    type="button"
                    key={filter.value}
                    aria-pressed={activeFilter === filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="task-page-list" aria-live="polite">
              {filteredTasks.length > 0 ? filteredTasks.map((task) => {
                const PriorityIcon = priorityIcons[task.priority] || CircleAlert;
                const project = projectById.get(task.projectId);
                const status = task.status || 'New';
                const statusClass = status.toLowerCase().replaceAll(' ', '-');

                return (
                  <article
                    key={task.storageId || task.id}
                    role="button"
                    tabIndex="0"
                    aria-label={`Open assigned task ${task.id}: ${task.title}`}
                    onClick={() => setSelectedTask(task)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTask(task);
                      }
                    }}
                  >
                    <span className={`task-page-priority priority-${(task.priority || 'High').toLowerCase()}`}>
                      <PriorityIcon aria-hidden="true" />
                    </span>
                    <div className="task-page-copy">
                      <span>{task.id}</span>
                      <strong>{task.title}</strong>
                      <p>{task.description || 'No description provided.'}</p>
                    </div>
                    <div className="task-page-project">
                      <span><Folder aria-hidden="true" /> Project</span>
                      <strong>{project?.name || task.projectName || 'Unknown project'}</strong>
                      <small>{project?.key || task.projectKey || ''}</small>
                    </div>
                    <div className="task-page-labels">
                      <span className={`table-pill priority-${(task.priority || 'High').toLowerCase()}`}>
                        <PriorityIcon aria-hidden="true" /> {task.priority || 'High'}
                      </span>
                      <span className={`table-pill status-${statusClass}`}>{status}</span>
                    </div>
                    <div className="task-page-due">
                      <span><CalendarDays aria-hidden="true" /> Due date</span>
                      <strong>{formatDate(task.dueDate)}</strong>
                    </div>
                  </article>
                );
              }) : (
                <div className="tasks-page-empty">
                  <span><ListChecks /></span>
                  <h2>{tasks.length === 0 ? 'No tasks assigned to you' : 'No matching tasks'}</h2>
                  <p>
                    {tasks.length === 0
                      ? 'Bugs assigned to you will appear here so you can track their priority, status, and due date.'
                      : 'Try selecting a different status filter or clearing your search.'}
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

      {selectedTask && (
        <BugDetailsModal
          bug={selectedTask}
          currentUser={session}
          canEditWorkflow={selectedTask.assigneeId === session.id}
          canDelete={(
            selectedTask.reporterId === session.id
            || projectById.get(selectedTask.projectId)?.ownerId === session.id
          )}
          onClose={() => setSelectedTask(null)}
          onBugUpdated={(updatedBug) => {
            setTasks((current) => current.map((task) => (
              (task.storageId || task.id) === (updatedBug.storageId || updatedBug.id) ? updatedBug : task
            )));
            setSelectedTask(updatedBug);
          }}
          onBugDeleted={(deletedBug) => {
            setTasks((current) => current.filter((task) => (
              (task.storageId || task.id) !== (deletedBug.storageId || deletedBug.id)
            )));
            setSelectedTask(null);
            setNotice(`${deletedBug.id} was deleted.`);
          }}
        />
      )}
    </div>
  );
};

export default MyTasks;
