export const PROJECTS_STORAGE_KEY = 'devtrack_projects';

export const readStoredProjects = () => {
  try {
    const projects = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY));
    return Array.isArray(projects) ? projects : [];
  } catch {
    return [];
  }
};

export const createProjectId = () => {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const saveProject = (projectData) => {
  const project = {
    ...projectData,
    id: createProjectId(),
    progress: 0,
    bugCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  const projects = readStoredProjects();
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([...projects, project]));
  return project;
};
