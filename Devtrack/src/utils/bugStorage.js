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
