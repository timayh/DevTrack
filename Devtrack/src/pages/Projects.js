import {
  BarChart3,
  Bug,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Code2,
  Folder,
  FolderPlus,
  Globe2,
  Home,
  LogOut,
  Plus,
  Search,
  ServerCog,
  Settings,
  Shapes,
  Smartphone,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CreateProjectModal from '../components/CreateProjectModal';
import '../styles/Dashboard.css';
import '../styles/Projects.css';
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

const filters = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

const projectTypes = {
  'software-development': { label: 'Software Development', icon: Code2 },
  'mobile-application': { label: 'Mobile Application', icon: Smartphone },
  'api-service': { label: 'API Service', icon: ServerCog },
  website: { label: 'Website', icon: Globe2 },
  other: { label: 'Other', icon: Shapes },
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

const Projects = () => {
  const navigate = useNavigate();
  const session = readLocalSession();
  const [projects, setProjects] = useState(() => readStoredProjects().filter((project) => (
    project.ownerId === session?.id || project.teamMemberIds?.includes(session?.id)
  )));
  const [bugs] = useState(() => readStoredBugs());
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const profileMenuRef = useRef(null);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const type = projectTypes[project.type] || projectTypes.other;
      const status = project.status || 'active';
      const matchesFilter = activeFilter === 'all' || status === activeFilter;
      const matchesSearch = !normalizedSearch
        || `${project.name} ${project.key} ${project.description || ''} ${type.label} ${project.leadName || ''}`
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, projects, searchTerm]);

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
    <div className="dashboard-page projects-page">
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
        <header className="dashboard-topbar projects-topbar">
          <label className="dashboard-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search projects</span>
            <input
              type="search"
              placeholder="Search projects..."
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

        <main className="projects-content">
          <header className="projects-heading">
            <h1>Project center</h1>
            <button type="button" onClick={() => setProjectModalOpen(true)}>
              <Plus /> New Project
            </button>
          </header>

          <section className="projects-panel" aria-labelledby="project-list-title">
            <div className="projects-toolbar">
              <div>
                <h2 id="project-list-title">Your projects</h2>
                <span>{filteredProjects.length} shown</span>
              </div>
              <div className="project-filters" aria-label="Filter projects">
                {filters.map((filter) => (
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

            <div className="projects-list" aria-live="polite">
              {filteredProjects.length > 0 ? filteredProjects.map((project) => {
                const type = projectTypes[project.type] || projectTypes.other;
                const ProjectTypeIcon = type.icon;
                const bugCount = bugs.filter((bug) => bug.projectId === project.id).length;
                const progress = project.progress ?? 0;

                return (
                  <article key={project.id}>
                    <Link className="project-list-link" to={`/projects/${project.id}`} aria-label={`Open ${project.name}`}>
                      <span className={`projects-list-icon project-type-${project.type || 'other'}`}>
                        <ProjectTypeIcon aria-hidden="true" />
                      </span>
                      <div className="projects-list-copy">
                        <div className="project-title-line">
                          <strong>{project.name}</strong>
                          <span>{project.key}</span>
                          {project.ownerId === session.id && <i>Owner</i>}
                        </div>
                        <p>{project.description || 'No project description provided.'}</p>
                        <small>{type.label} · Led by {project.leadName || session.fullName}</small>
                      </div>
                      <div className="projects-list-progress">
                        <span><b>Progress</b><strong>{progress}%</strong></span>
                        <i><b style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></i>
                      </div>
                      <div className="projects-list-meta">
                        <span><Bug aria-hidden="true" /> {bugCount} {bugCount === 1 ? 'bug' : 'bugs'}</span>
                        <span><Users aria-hidden="true" /> {(project.teamMemberIds?.length || 0) + 1} members</span>
                        <span><CalendarDays aria-hidden="true" /> {formatDate(project.endDate)}</span>
                      </div>
                    </Link>
                  </article>
                );
              }) : (
                <div className="projects-page-empty">
                  <span><FolderPlus /></span>
                  <h2>{projects.length === 0 ? 'No projects yet' : 'No matching projects'}</h2>
                  <p>
                    {projects.length === 0
                      ? 'Create your first project to organize bugs, deadlines, and your team in one place.'
                      : 'Try selecting a different filter or clearing your search.'}
                  </p>
                  {projects.length === 0 ? (
                    <button type="button" onClick={() => setProjectModalOpen(true)}><Plus /> Create project</button>
                  ) : (
                    <button type="button" onClick={clearFilters}>Clear filters</button>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

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
    </div>
  );
};

export default Projects;
