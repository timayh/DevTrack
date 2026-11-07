import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Bug,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CircleAlert,
  Code2,
  Folder,
  Globe2,
  Home,
  LogOut,
  Minus,
  Play,
  Plus,
  Search,
  ServerCog,
  Settings,
  Shapes,
  Smartphone,
  Target,
  TimerReset,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BugDetailsModal from '../components/BugDetailsModal';
import CreateBugModal from '../components/CreateBugModal';
import StartSprintModal from '../components/StartSprintModal';
import '../styles/Dashboard.css';
import '../styles/ProjectDetails.css';
import { clearLocalSession, readLocalSession } from '../utils/authStorage';
import { readStoredBugs } from '../utils/bugStorage';
import { readStoredProjects } from '../utils/projectStorage';

const navigationItems = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Projects', icon: Folder, path: '/projects', active: true },
  { label: 'My Tasks', icon: CheckSquare, path: '/tasks' },
  { label: 'Report', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const bugFilters = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
];

const projectTypes = {
  'software-development': { label: 'Software Development', icon: Code2 },
  'mobile-application': { label: 'Mobile Application', icon: Smartphone },
  'api-service': { label: 'API Service', icon: ServerCog },
  website: { label: 'Website', icon: Globe2 },
  other: { label: 'Other', icon: Shapes },
};

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

const formatDate = (date, includeTime = false) => {
  if (!date) return 'Not set';

  const value = includeTime ? new Date(date) : new Date(`${date}T00:00:00`);
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const matchesBugFilter = (bug, filter) => {
  if (filter === 'all') return true;
  if (filter === 'open') return ['New', 'Assigned', 'Reopened'].includes(bug.status);
  if (filter === 'in-progress') return bug.status === 'In Progress';
  return bug.status === 'Closed';
};

const getSprintDaysLabel = (endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${endDate}T00:00:00`);
  const difference = Math.ceil((end.getTime() - today.getTime()) / 86400000);

  if (difference < 0) {
    const overdueDays = Math.abs(difference);
    return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
  }
  if (difference === 0) return 'Ends today';
  return `${difference} day${difference === 1 ? '' : 's'} left`;
};

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const session = readLocalSession();
  const [project, setProject] = useState(() => readStoredProjects().find((storedProject) => (
    storedProject.id === projectId
    && (storedProject.ownerId === session?.id || storedProject.teamMemberIds?.includes(session?.id))
  )));
  const [bugs, setBugs] = useState(() => readStoredBugs().filter((bug) => bug.projectId === projectId));
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [notice, setNotice] = useState('');
  const profileMenuRef = useRef(null);

  useEffect(() => {
    setProject(readStoredProjects().find((storedProject) => (
      storedProject.id === projectId
      && (storedProject.ownerId === session?.id || storedProject.teamMemberIds?.includes(session?.id))
    )));
  }, [projectId, session?.id]);

  const filteredBugs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...bugs]
      .filter((bug) => matchesBugFilter(bug, activeFilter))
      .filter((bug) => !normalizedSearch
        || `${bug.id} ${bug.title} ${bug.description || ''} ${bug.priority} ${bug.status} ${bug.assigneeName || ''}`
          .toLowerCase()
          .includes(normalizedSearch))
      .sort((first, second) => (
        new Date(second.updatedAt || second.createdAt).getTime()
        - new Date(first.updatedAt || first.createdAt).getTime()
      ));
  }, [activeFilter, bugs, searchTerm]);

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

  const openBugCount = bugs.filter((bug) => ['New', 'Assigned', 'Reopened'].includes(bug.status)).length;
  const inProgressCount = bugs.filter((bug) => bug.status === 'In Progress').length;
  const closedCount = bugs.filter((bug) => bug.status === 'Closed').length;
  const activeSprint = project?.sprints?.find((sprint) => (
    sprint.id === project.activeSprintId && sprint.status === 'active'
  ));
  const sprintProgress = bugs.length > 0 ? Math.round((closedCount / bugs.length) * 100) : 0;
  const projectType = projectTypes[project?.type] || projectTypes.other;
  const ProjectTypeIcon = projectType.icon;

  return (
    <div className="dashboard-page project-details-page">
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
                if (path && (!active || path === '/projects')) navigate(path);
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
        <header className="dashboard-topbar project-details-topbar">
          <label className="dashboard-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search project bugs</span>
            <input
              type="search"
              placeholder="Search bugs in this project..."
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

        <main className="project-details-content">
          {!project ? (
            <section className="project-not-found">
              <span><Folder /></span>
              <h1>Project not found</h1>
              <p>This project may have been removed, or you may not have access to it.</p>
              <button type="button" onClick={() => navigate('/projects')}><ArrowLeft /> Back to projects</button>
            </section>
          ) : (
            <>
              <button className="back-to-projects" type="button" onClick={() => navigate('/projects')}>
                <ArrowLeft /> Back to projects
              </button>

              <section className="project-overview">
                <span className={`project-overview-icon project-type-${project.type || 'other'}`}>
                  <ProjectTypeIcon aria-hidden="true" />
                </span>
                <div className="project-overview-copy">
                  <div>
                    <span>{project.key}</span>
                    <span>{projectType.label}</span>
                    {project.ownerId === session.id && <span>Owner</span>}
                  </div>
                  <h1>{project.name}</h1>
                  <p>{project.description || 'No project description provided.'}</p>
                </div>
                <dl className="project-overview-meta">
                  <div><dt><UserRound /> Project lead</dt><dd>{project.leadName || session.fullName}</dd></div>
                  <div><dt><CalendarDays /> Due date</dt><dd>{formatDate(project.endDate)}</dd></div>
                </dl>
              </section>

              <section className={`project-sprint-card ${activeSprint ? 'has-active-sprint' : ''}`} aria-labelledby="project-sprint-title">
                <span className="project-sprint-icon" aria-hidden="true"><TimerReset /></span>
                <div className="project-sprint-copy">
                  <span>{activeSprint ? 'Active sprint' : 'Sprint planning'}</span>
                  <h2 id="project-sprint-title">{activeSprint?.name || 'No active sprint'}</h2>
                  {activeSprint ? (
                    <>
                      <p>{activeSprint.goal || 'Work through the project’s current bugs during this sprint.'}</p>
                      <small>
                        <CalendarDays /> {formatDate(activeSprint.startDate)} – {formatDate(activeSprint.endDate)}
                        <b>{getSprintDaysLabel(activeSprint.endDate)}</b>
                      </small>
                    </>
                  ) : (
                    <p>
                      {project.ownerId === session.id
                        ? 'Create a focused timeframe and track progress against the project’s bugs.'
                        : 'The project owner has not started a sprint yet.'}
                    </p>
                  )}
                </div>
                {activeSprint ? (
                  <div className="project-sprint-progress">
                    <span><Target /> Progress <strong>{sprintProgress}%</strong></span>
                    <i><b style={{ width: `${sprintProgress}%` }} /></i>
                    <small>{closedCount} of {bugs.length} bugs closed</small>
                  </div>
                ) : project.ownerId === session.id ? (
                  <button type="button" onClick={() => setSprintModalOpen(true)}><Play /> Start Sprint</button>
                ) : null}
              </section>

              <section className="project-bug-summary" aria-label="Project bug statistics">
                <article><span>All bugs</span><strong>{bugs.length}</strong></article>
                <article><span>Open</span><strong>{openBugCount}</strong></article>
                <article><span>In progress</span><strong>{inProgressCount}</strong></article>
                <article><span>Closed</span><strong>{closedCount}</strong></article>
              </section>

              <section className="project-bugs-panel" aria-labelledby="project-bugs-title">
                <div className="project-bugs-toolbar">
                  <div>
                    <h2 id="project-bugs-title">All bugs</h2>
                    <span>{filteredBugs.length} shown</span>
                  </div>
                  <div className="project-bugs-actions">
                    <div className="project-bug-filters" aria-label="Filter project bugs">
                      {bugFilters.map((filter) => (
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
                    <button className="project-create-bug" type="button" onClick={() => setBugModalOpen(true)}>
                      <Plus /> Create Bug
                    </button>
                  </div>
                </div>

                <div className="project-bugs-list" aria-live="polite">
                  {filteredBugs.length > 0 ? filteredBugs.map((bug) => {
                    const PriorityIcon = priorityIcons[bug.priority] || CircleAlert;
                    const statusClass = (bug.status || 'New').toLowerCase().replaceAll(' ', '-');

                    return (
                      <article
                        key={bug.storageId || bug.id}
                        role="button"
                        tabIndex="0"
                        aria-label={`Open bug ${bug.id}: ${bug.title}`}
                        onClick={() => setSelectedBug(bug)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedBug(bug);
                          }
                        }}
                      >
                        <span className={`project-bug-priority priority-${(bug.priority || 'High').toLowerCase()}`}>
                          <PriorityIcon aria-hidden="true" />
                        </span>
                        <div className="project-bug-copy">
                          <span>{bug.id}</span>
                          <strong>{bug.title}</strong>
                          <p>{bug.description || 'No description provided.'}</p>
                        </div>
                        <div className="project-bug-labels">
                          <span className={`table-pill priority-${(bug.priority || 'High').toLowerCase()}`}>
                            <PriorityIcon aria-hidden="true" /> {bug.priority || 'High'}
                          </span>
                          <span className={`table-pill status-${statusClass}`}>{bug.status || 'New'}</span>
                        </div>
                        <div className="project-bug-meta">
                          <span><UserRound /> {bug.assigneeName || 'Unassigned'}</span>
                          <time>Updated {formatDate(bug.updatedAt || bug.createdAt, true)}</time>
                        </div>
                      </article>
                    );
                  }) : (
                    <div className="project-bugs-empty">
                      <span><Bug /></span>
                      <h2>{bugs.length === 0 ? 'No bugs in this project' : 'No matching bugs'}</h2>
                      <p>
                        {bugs.length === 0
                          ? 'Create the first bug report for this project when you find something that needs attention.'
                          : 'Try a different status filter or clear your search.'}
                      </p>
                      {bugs.length === 0 ? (
                        <button type="button" onClick={() => setBugModalOpen(true)}><Plus /> Create bug</button>
                      ) : (
                        <button type="button" onClick={clearFilters}>Clear filters</button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {bugModalOpen && project && (
        <CreateBugModal
          currentUser={session}
          projects={[project]}
          onClose={() => setBugModalOpen(false)}
          onBugCreated={(bug) => {
            setBugs((current) => [...current, bug]);
            setBugModalOpen(false);
            setNotice(`${bug.id} was created successfully.`);
          }}
        />
      )}

      {sprintModalOpen && project && project.ownerId === session.id && (
        <StartSprintModal
          project={project}
          currentUser={session}
          onClose={() => setSprintModalOpen(false)}
          onSprintStarted={({ project: updatedProject, sprint }) => {
            setProject(updatedProject);
            setSprintModalOpen(false);
            setNotice(`${sprint.name} started successfully.`);
          }}
        />
      )}

      {selectedBug && (
        <BugDetailsModal
          bug={selectedBug}
          currentUser={session}
          canEditWorkflow={(
            project?.ownerId === session.id || selectedBug.assigneeId === session.id
          )}
          canDelete={(
            project?.ownerId === session.id || selectedBug.reporterId === session.id
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

export default ProjectDetails;
