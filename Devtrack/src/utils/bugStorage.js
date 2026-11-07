export const BUGS_STORAGE_KEY = 'devtrack_bugs';

export const readStoredBugs = () => {
  try {
    const bugs = JSON.parse(localStorage.getItem(BUGS_STORAGE_KEY));
    return Array.isArray(bugs) ? bugs : [];
  } catch {
    return [];
  }
};

const createBugRecordId = () => {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `bug-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createCommentId = () => {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `comment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createDisplayId = (projectKey, bugs) => {
  const prefix = `${projectKey.toUpperCase()}-`;
  const nextNumber = bugs.reduce((highest, bug) => {
    if (!bug.id?.startsWith(prefix)) return highest;

    const bugNumber = Number.parseInt(bug.id.slice(prefix.length), 10);
    return Number.isNaN(bugNumber) ? highest : Math.max(highest, bugNumber);
  }, 0) + 1;

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

export const saveBug = (bugData) => {
  const bugs = readStoredBugs();
  const timestamp = new Date().toISOString();
  const bug = {
    ...bugData,
    storageId: createBugRecordId(),
    id: createDisplayId(bugData.projectKey, bugs),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify([...bugs, bug]));
  return bug;
};

export const addBugComment = (bugIdentifier, commentData) => {
  const bugs = readStoredBugs();
  const bugIndex = bugs.findIndex((bug) => (
    bug.storageId === bugIdentifier || bug.id === bugIdentifier
  ));

  if (bugIndex === -1) return null;

  const timestamp = new Date().toISOString();
  const comment = {
    id: createCommentId(),
    userId: commentData.userId,
    authorName: commentData.authorName,
    body: commentData.body.trim(),
    createdAt: timestamp,
  };
  const updatedBug = {
    ...bugs[bugIndex],
    comments: [...(bugs[bugIndex].comments || []), comment],
    updatedAt: timestamp,
  };
  const updatedBugs = [...bugs];
  updatedBugs[bugIndex] = updatedBug;
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify(updatedBugs));

  return updatedBug;
};

export const updateBugWorkflow = (bugIdentifier, changes) => {
  const allowedPriorities = ['Critical', 'High', 'Medium', 'Low'];
  const allowedStatuses = ['New', 'Assigned', 'In Progress', 'Reopened', 'Closed'];
  const bugs = readStoredBugs();
  const bugIndex = bugs.findIndex((bug) => (
    bug.storageId === bugIdentifier || bug.id === bugIdentifier
  ));

  if (bugIndex === -1) return null;

  const workflowChanges = {};
  if (changes.priority && allowedPriorities.includes(changes.priority)) {
    workflowChanges.priority = changes.priority;
  }
  if (changes.status && allowedStatuses.includes(changes.status)) {
    workflowChanges.status = changes.status;
  }
  if (Object.keys(workflowChanges).length === 0) return bugs[bugIndex];

  const updatedBug = {
    ...bugs[bugIndex],
    ...workflowChanges,
    updatedAt: new Date().toISOString(),
  };
  const updatedBugs = [...bugs];
  updatedBugs[bugIndex] = updatedBug;
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify(updatedBugs));

  return updatedBug;
};

export const deleteStoredBug = (bugIdentifier) => {
  const bugs = readStoredBugs();
  const remainingBugs = bugs.filter((bug) => (
    bug.storageId !== bugIdentifier && bug.id !== bugIdentifier
  ));

  if (remainingBugs.length === bugs.length) return false;
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify(remainingBugs));
  return true;
};
