export const NOTIFICATIONS_STORAGE_KEY = 'devtrack_notifications';
export const NOTIFICATIONS_UPDATED_EVENT = 'devtrack:notifications-updated';

const createNotificationId = () => (
  typeof window.crypto?.randomUUID === 'function'
    ? window.crypto.randomUUID()
    : `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const announceNotificationUpdate = () => {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
};

export const readStoredNotifications = () => {
  try {
    const notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY));
    return Array.isArray(notifications) ? notifications : [];
  } catch {
    return [];
  }
};

export const readUserNotifications = (userId) => readStoredNotifications()
  .filter((notification) => notification.userId === userId)
  .sort((first, second) => (
    new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime()
  ));

export const saveNotification = (notificationData) => {
  const notification = {
    ...notificationData,
    id: createNotificationId(),
    read: false,
    createdAt: new Date().toISOString(),
  };
  const notifications = readStoredNotifications();
  localStorage.setItem(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify([notification, ...notifications]),
  );
  announceNotificationUpdate();
  return notification;
};

export const saveNotificationsForUsers = (userIds, createNotificationData) => {
  const recipients = [...new Set(userIds.filter(Boolean))];
  if (recipients.length === 0) return [];

  const createdAt = new Date().toISOString();
  const notifications = recipients.map((userId) => ({
    ...(typeof createNotificationData === 'function'
      ? createNotificationData(userId)
      : createNotificationData),
    id: createNotificationId(),
    userId,
    read: false,
    createdAt,
  }));

  localStorage.setItem(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify([...notifications, ...readStoredNotifications()]),
  );
  announceNotificationUpdate();
  return notifications;
};

const getActorName = (actor) => actor.nickname || actor.fullName || 'A team member';

export const notifyProjectMembers = ({ project, actor, message, detail }) => {
  const recipientIds = [project.ownerId, ...(project.teamMemberIds || [])]
    .filter((userId) => userId !== actor.id);

  return saveNotificationsForUsers(recipientIds, {
    category: 'project',
    message: message || `${getActorName(actor)} updated ${project.name}`,
    detail,
    actorId: actor.id,
    projectId: project.id,
  });
};

export const notifyBugActivity = ({
  project,
  bug,
  actor,
  selfMessage,
  teamMessage,
  detail,
  category = 'bug',
}) => {
  const recipientIds = [
    actor.id,
    project?.ownerId,
    ...(project?.teamMemberIds || []),
    bug.assigneeId,
    bug.reporterId,
  ];

  return saveNotificationsForUsers(recipientIds, (userId) => ({
    category,
    message: userId === actor.id
      ? selfMessage
      : teamMessage || `${getActorName(actor)} updated bug ${bug.id}`,
    detail,
    actorId: actor.id,
    projectId: bug.projectId,
    bugId: bug.storageId || bug.id,
  }));
};

export const markNotificationRead = (notificationId, userId) => {
  const notifications = readStoredNotifications().map((notification) => (
    notification.id === notificationId && notification.userId === userId
      ? { ...notification, read: true }
      : notification
  ));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  announceNotificationUpdate();
  return readUserNotifications(userId);
};

export const markAllUserNotificationsRead = (userId) => {
  const notifications = readStoredNotifications().map((notification) => (
    notification.userId === userId ? { ...notification, read: true } : notification
  ));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  announceNotificationUpdate();
  return readUserNotifications(userId);
};
