import {
  BarChart3,
  Bug,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  Code2,
  Folder,
  Globe2,
  Home,
  ListChecks,
  LogOut,
  Search,
  ServerCog,
  Settings,
  Shapes,
  Smartphone,
  Target,
  TimerReset,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import '../styles/Dashboard.css';
import '../styles/Reports.css';
import { clearLocalSession, readLocalSession } from '../utils/authStorage';
import { readStoredBugs } from '../utils/bugStorage';
import { readStoredProjects } from '../utils/projectStorage';

const navigationItems = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Projects', icon: Folder, path: '/projects' },
  { label: 'My Tasks', icon: CheckSquare, path: '/tasks' },
  { label: 'Report', icon: BarChart3, path: '/reports', active: true },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const projectTypes = {
  'software-development': { label: 'Software Development', icon: Code2 },
  'mobile-application': { label: 'Mobile Application', icon: Smartphone },
  'api-service': { label: 'API Service', icon: ServerCog },
  website: { label: 'Website', icon: Globe2 },
  other: { label: 'Other', icon: Shapes },
};

const statusOrder = ['New', 'Assigned', 'In Progress', 'Reopened', 'Closed'];
const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];

const getInitials = (name = 'DevTrack User') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

const formatDate = (date) => {
  if (!date) return 'Not set';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDaysLabel = (endDate) => {
  if (!endDate) return 'No end date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);

  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Ends today';
  return `${days} day${days === 1 ? '' : 's'} left`;
};

const Reports = () => {
  const navigate = useNavigate();
  const session = readLocalSession();
  const [projects] = useState(() => readStoredProjects().filter((project) => (
    project.ownerId === session?.id || project.teamMemberIds?.includes(session?.id)
  )));
  const [bugs] = useState(() => readStoredBugs());
  const [selectedProjectId, setSelectedProjectId] = useState(() => (
    readStoredProjects().find((project) => (
      project.ownerId === session?.id || project.teamMemberIds?.includes(session?.id)
    ))?.id || ''
  ));
  const [projectSearch, setProjectSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const profileMenuRef = useRef(null);
  const searchRef = useRef(null);

  const projectOptions = useMemo(() => projects.map((project) => {
    const type = projectTypes[project.type] || projectTypes.other;
    return {
      value: project.id,
      label: `${project.name} · ${project.key}`,
      icon: type.icon,
      iconClass: `select-icon-${project.type || 'other'}`,
    };
  }), [projects]);

  const searchResults = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) => (
      `${project.name} ${project.key} ${project.description || ''}`.toLowerCase().includes(query)
    ));
  }, [projectSearch, projects]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;
  const selectedBugs = useMemo(() => bugs.filter((bug) => (
    bug.projectId === selectedProjectId
  )), [bugs, selectedProjectId]);

  const report = useMemo(() => {
    const statusCounts = Object.fromEntries(statusOrder.map((status) => [
      status,
      selectedBugs.filter((bug) => (bug.status || 'New') === status).length,
    ]));
    const priorityCounts = Object.fromEntries(priorityOrder.map((priority) => [
      priority,
      selectedBugs.filter((bug) => (bug.priority || 'High') === priority).length,
    ]));
    const total = selectedBugs.length;
    const open = statusCounts.New + statusCounts.Assigned + statusCounts.Reopened;
    const inProgress = statusCounts['In Progress'];
    const resolved = statusCounts.Closed;
    const completion = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = selectedBugs.filter((bug) => (
      bug.status !== 'Closed'
      && bug.dueDate
      && new Date(`${bug.dueDate}T00:00:00`).getTime() < today.getTime()
    )).length;
    const dueSoon = selectedBugs.filter((bug) => {
      if (bug.status === 'Closed' || !bug.dueDate) return false;
      const difference = Math.ceil((new Date(`${bug.dueDate}T00:00:00`).getTime() - today.getTime()) / 86400000);
      return difference >= 0 && difference <= 7;
    }).length;

    return {
      total,
      open,
      inProgress,
      resolved,
      completion,
      overdue,
      dueSoon,
      assignedToMe: selectedBugs.filter((bug) => bug.assigneeId === session?.id).length,
      statusCounts,
      priorityCounts,
      comments: selectedBugs.reduce((sum, bug) => sum + (bug.comments?.length || 0), 0),
    };
  }, [selectedBugs, session?.id]);

  const activeSprint = selectedProject?.sprints?.find((sprint) => (
    sprint.id === selectedProject.activeSprintId && sprint.status === 'active'
  ));
  const recentBugs = useMemo(() => [...selectedBugs]
    .sort((first, second) => (
      new Date(second.updatedAt || second.createdAt || 0).getTime()
      - new Date(first.updatedAt || first.createdAt || 0).getTime()
    ))
    .slice(0, 5), [selectedBugs]);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const closeProfile = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener('pointerdown', closeProfile);
    return () => document.removeEventListener('pointerdown', closeProfile);
  }, [profileOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const closeSearch = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('pointerdown', closeSearch);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeSearch);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!notice) return undefined;
    const dismissTimer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(dismissTimer);
  }, [notice]);

  const selectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setProjectSearch('');
    setSearchOpen(false);
  };

  const handleLogout = () => {
    clearLocalSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard-page reports-page">
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
        <header className="dashboard-topbar reports-topbar">
          <div className="report-search-wrap" ref={searchRef}>
            <label className="dashboard-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Search project reports</span>
              <input
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={searchOpen}
                aria-controls="report-project-search-results"
                placeholder="Search projects for reports..."
                value={projectSearch}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setProjectSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && searchResults[0]) {
                    event.preventDefault();
                    selectProject(searchResults[0].id);
                  }
                }}
              />
            </label>
            {searchOpen && projectSearch.trim() && (
              <div className="report-search-results" id="report-project-search-results" role="listbox" aria-label="Project search results">
                {searchResults.length > 0 ? searchResults.slice(0, 6).map((project) => {
                  const type = projectTypes[project.type] || projectTypes.other;
                  const ProjectIcon = type.icon;
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={project.id === selectedProjectId}
                      aria-label={`Select ${project.name} report`}
                      key={project.id}
                      onClick={() => selectProject(project.id)}
                    >
                      <span className={`report-search-icon project-type-${project.type || 'other'}`}><ProjectIcon /></span>
                      <span><strong>{project.name}</strong><small>{project.key} · {type.label}</small></span>
                    </button>
                  );
                }) : <p>No projects match your search.</p>}
              </div>
            )}
          </div>

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

        <main className="reports-content">
          <header className="reports-heading">
            <div>
              <h1>Reports</h1>
              <p>Review project health, issue trends, and sprint progress.</p>
            </div>
            {projects.length > 0 && (
              <div className="report-project-select">
                <label id="report-project-label" htmlFor="reportProject">Project report</label>
                <CustomSelect
                  id="reportProject"
                  ariaLabel="Report project"
                  value={selectedProjectId}
                  options={projectOptions}
                  onChange={selectProject}
                />
              </div>
            )}
          </header>

          {!selectedProject ? (
            <section className="reports-empty">
              <span><BarChart3 /></span>
              <h2>No projects to report on</h2>
              <p>Create or join a project before viewing project and sprint statistics.</p>
              <button type="button" onClick={() => navigate('/projects')}>View projects</button>
            </section>
          ) : (
            <>
              <section className="report-project-overview" aria-label={`${selectedProject.name} report overview`}>
                {(() => {
                  const type = projectTypes[selectedProject.type] || projectTypes.other;
                  const ProjectIcon = type.icon;
                  return <span className={`report-project-icon project-type-${selectedProject.type || 'other'}`}><ProjectIcon /></span>;
                })()}
                <div>
                  <span>{selectedProject.key} · {(projectTypes[selectedProject.type] || projectTypes.other).label}</span>
                  <h2>{selectedProject.name}</h2>
                  <p>{selectedProject.description || 'No project description provided.'}</p>
                </div>
                <button type="button" onClick={() => navigate(`/projects/${selectedProject.id}`)}>View project</button>
              </section>

              <section className="report-metrics" aria-label="Project report statistics">
                <article aria-label="Total bugs"><span><Bug /></span><div><small>Total bugs</small><strong>{report.total}</strong></div></article>
                <article aria-label="Open bugs"><span><CircleAlert /></span><div><small>Open</small><strong>{report.open}</strong></div></article>
                <article aria-label="In progress bugs"><span><Clock3 /></span><div><small>In progress</small><strong>{report.inProgress}</strong></div></article>
                <article aria-label="Resolved bugs"><span><CircleCheckBig /></span><div><small>Resolved</small><strong>{report.resolved}</strong></div></article>
              </section>

              <div className="report-chart-grid">
                <section className="report-panel" aria-labelledby="status-breakdown-title">
                  <header><div><h2 id="status-breakdown-title">Status breakdown</h2><p>Current bug workflow distribution</p></div><ListChecks /></header>
                  <div className="report-bars">
                    {statusOrder.map((status) => {
                      const count = report.statusCounts[status];
                      const percent = report.total > 0 ? Math.round((count / report.total) * 100) : 0;
                      return (
                        <div className="report-bar-row" key={status}>
                          <span>{status}</span>
                          <i><b className={`report-bar-status-${status.toLowerCase().replaceAll(' ', '-')}`} style={{ width: `${percent}%` }} /></i>
                          <strong>{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="report-panel" aria-labelledby="priority-breakdown-title">
                  <header><div><h2 id="priority-breakdown-title">Priority breakdown</h2><p>Severity across this project</p></div><CircleAlert /></header>
                  <div className="report-bars">
                    {priorityOrder.map((priority) => {
                      const count = report.priorityCounts[priority];
                      const percent = report.total > 0 ? Math.round((count / report.total) * 100) : 0;
                      return (
                        <div className="report-bar-row" key={priority}>
                          <span>{priority}</span>
                          <i><b className={`report-bar-priority-${priority.toLowerCase()}`} style={{ width: `${percent}%` }} /></i>
                          <strong>{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="report-detail-grid">
                <section className="report-panel report-sprint-panel" aria-labelledby="sprint-report-title">
                  <header><div><h2 id="sprint-report-title">Sprint report</h2><p>Progress for the active project sprint</p></div><TimerReset /></header>
                  {activeSprint ? (
                    <div className="report-active-sprint">
                      <div className="report-sprint-title">
                        <div><span>Active sprint</span><strong>{activeSprint.name}</strong></div>
                        <i>{getDaysLabel(activeSprint.endDate)}</i>
                      </div>
                      <p><Target /> {activeSprint.goal || 'No sprint goal provided.'}</p>
                      <span><CalendarDays /> {formatDate(activeSprint.startDate)} – {formatDate(activeSprint.endDate)}</span>
                      <div className="report-sprint-progress">
                        <div><span>Completion</span><strong>{report.completion}%</strong></div>
                        <i><b style={{ width: `${report.completion}%` }} /></i>
                      </div>
                      <div className="report-sprint-stats">
                        <div><strong>{report.open}</strong><span>Open</span></div>
                        <div><strong>{report.inProgress}</strong><span>In progress</span></div>
                        <div><strong>{report.resolved}</strong><span>Resolved</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="report-no-sprint"><TimerReset /><strong>No active sprint</strong><p>Start a sprint from this project to see sprint analytics here.</p></div>
                  )}
                </section>

                <section className="report-panel report-health-panel" aria-labelledby="project-health-title">
                  <header><div><h2 id="project-health-title">Project health</h2><p>Key delivery and workload signals</p></div><TrendingUp /></header>
                  <div className="report-health-score">
                    <div style={{ '--report-progress': `${report.completion * 3.6}deg` }}><strong>{report.completion}%</strong><span>Complete</span></div>
                    <p>{report.total === 0 ? 'No bugs have been reported yet.' : `${report.resolved} of ${report.total} bugs are closed.`}</p>
                  </div>
                  <dl className="report-health-list">
                    <div><dt>Overdue bugs</dt><dd>{report.overdue}</dd></div>
                    <div><dt>Due in 7 days</dt><dd>{report.dueSoon}</dd></div>
                    <div><dt>Assigned to you</dt><dd>{report.assignedToMe}</dd></div>
                    <div><dt>Comments added</dt><dd>{report.comments}</dd></div>
                  </dl>
                </section>
              </div>

              <section className="report-panel report-recent-panel" aria-labelledby="recent-report-bugs-title">
                <header><div><h2 id="recent-report-bugs-title">Recent bugs</h2><p>Latest activity in {selectedProject.name}</p></div><Bug /></header>
                {recentBugs.length > 0 ? (
                  <div className="report-table-wrap">
                    <table>
                      <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Due date</th></tr></thead>
                      <tbody>
                        {recentBugs.map((bug) => (
                          <tr key={bug.storageId || bug.id}>
                            <td>{bug.id}</td>
                            <td>{bug.title}</td>
                            <td><span className={`table-pill priority-${(bug.priority || 'High').toLowerCase()}`}>{bug.priority || 'High'}</span></td>
                            <td><span className={`table-pill status-${(bug.status || 'New').toLowerCase().replaceAll(' ', '-')}`}>{bug.status || 'New'}</span></td>
                            <td>{formatDate(bug.dueDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="report-table-empty"><Bug /><span>No bugs have been reported for this project.</span></div>}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Reports;
