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

const createSprintId = () => {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `sprint-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

export const startProjectSprint = (projectId, sprintData, userId) => {
  const projects = readStoredProjects();
  const projectIndex = projects.findIndex((project) => project.id === projectId);

  if (projectIndex === -1 || projects[projectIndex].ownerId !== userId) return null;

  const project = projects[projectIndex];
  const hasActiveSprint = (project.sprints || []).some((sprint) => (
    sprint.id === project.activeSprintId && sprint.status === 'active'
  ));
  if (hasActiveSprint) return null;

  const sprint = {
    id: createSprintId(),
    name: sprintData.name.trim(),
    goal: sprintData.goal.trim(),
    startDate: sprintData.startDate,
    endDate: sprintData.endDate,
    status: 'active',
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };
  const updatedProject = {
    ...project,
    sprints: [...(project.sprints || []), sprint],
    activeSprintId: sprint.id,
    updatedAt: new Date().toISOString(),
  };
  const updatedProjects = [...projects];
  updatedProjects[projectIndex] = updatedProject;
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));

  return { project: updatedProject, sprint };
};

export const updateStoredProjectUserName = (userId, displayName) => {
  const projects = readStoredProjects();
  let hasChanges = false;

  const updatedProjects = projects.map((project) => {
    const isProjectLead = project.leadId === userId
      || (!project.leadId && project.ownerId === userId);

    if (!isProjectLead || project.leadName === displayName) return project;

    hasChanges = true;
    return { ...project, leadName: displayName };
  });

  if (hasChanges) {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));
  }

  return updatedProjects;
};
