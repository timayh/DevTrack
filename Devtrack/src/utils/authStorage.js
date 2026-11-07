export const USERS_STORAGE_KEY = 'devtrack_users';
export const SESSION_STORAGE_KEY = 'devtrack_current_user';

export const hashPassword = async (password) => {
  if (!window.crypto?.subtle) {
    let fallbackHash = 2166136261;

    for (let index = 0; index < password.length; index += 1) {
      fallbackHash ^= password.charCodeAt(index);
      fallbackHash = Math.imul(fallbackHash, 16777619);
    }

    return `local-${(fallbackHash >>> 0).toString(16).padStart(8, '0')}`;
  }

  const passwordData = new TextEncoder().encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', passwordData);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const readStoredUsers = () => {
  try {
    const storedUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY));
    return Array.isArray(storedUsers) ? storedUsers : [];
  } catch {
    return [];
  }
};

export const saveStoredUsers = (users) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const createUserId = () => {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const saveLocalSession = (user) => {
  const session = {
    id: user.id,
    fullName: user.fullName,
    nickname: user.nickname || '',
    email: user.email,
    usage: user.usage,
    profileImage: user.profileImage || '',
    loggedInAt: new Date().toISOString(),
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
};

export const readLocalSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));
    return session && session.id && session.email ? session : null;
  } catch {
    return null;
  }
};

export const clearLocalSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const updateLocalProfile = (userId, { nickname, profileImage }) => {
  const users = readStoredUsers();
  const userIndex = users.findIndex((user) => user.id === userId);

  if (userIndex === -1) return null;

  const updatedUser = {
    ...users[userIndex],
    nickname: nickname.trim(),
    profileImage: profileImage || '',
    updatedAt: new Date().toISOString(),
  };

  users[userIndex] = updatedUser;
  saveStoredUsers(users);

  const currentSession = readLocalSession();
  let session = currentSession;

  if (currentSession?.id === userId) {
    session = {
      ...currentSession,
      fullName: updatedUser.fullName,
      nickname: updatedUser.nickname,
      profileImage: updatedUser.profileImage,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  return { user: updatedUser, session };
};

export const changeLocalPassword = async (userId, currentPassword, newPassword) => {
  const users = readStoredUsers();
  const userIndex = users.findIndex((user) => user.id === userId);

  if (userIndex === -1) return { ok: false, reason: 'not-found' };

  const currentPasswordHash = await hashPassword(currentPassword);

  if (users[userIndex].passwordHash !== currentPasswordHash) {
    return { ok: false, reason: 'incorrect-password' };
  }

  users[userIndex] = {
    ...users[userIndex],
    passwordHash: await hashPassword(newPassword),
    updatedAt: new Date().toISOString(),
  };
  saveStoredUsers(users);

  return { ok: true };
};
