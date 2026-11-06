export const NOTIFICATIONS_STORAGE_KEY = 'devtrack_notifications';

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
    id: typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const notifications = readStoredNotifications();
  localStorage.setItem(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify([notification, ...notifications]),
  );
  return notification;
};

export const markNotificationRead = (notificationId, userId) => {
  const notifications = readStoredNotifications().map((notification) => (
    notification.id === notificationId && notification.userId === userId
      ? { ...notification, read: true }
      : notification
  ));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  return readUserNotifications(userId);
};

export const markAllUserNotificationsRead = (userId) => {
  const notifications = readStoredNotifications().map((notification) => (
    notification.userId === userId ? { ...notification, read: true } : notification
  ));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  return readUserNotifications(userId);
};
