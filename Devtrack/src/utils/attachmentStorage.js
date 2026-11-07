const ATTACHMENT_DATABASE = 'devtrack_attachments';
const ATTACHMENT_STORE = 'bug_files';

const createAttachmentId = () => {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Unable to read the attachment.'));
  reader.readAsDataURL(file);
});

const openAttachmentDatabase = () => new Promise((resolve, reject) => {
  const request = window.indexedDB.open(ATTACHMENT_DATABASE, 1);

  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(ATTACHMENT_STORE)) {
      database.createObjectStore(ATTACHMENT_STORE, { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Unable to open local attachment storage.'));
});

const saveWithDataUrls = async (files) => Promise.all(files.map(async (file) => ({
  id: createAttachmentId(),
  name: file.name,
  size: file.size,
  type: file.type,
  dataUrl: await fileToDataUrl(file),
})));

export const saveBugAttachments = async (fileList) => {
  const files = Array.from(fileList || []);
  if (files.length === 0) return [];

  if (!window.indexedDB) return saveWithDataUrls(files);

  try {
    const database = await openAttachmentDatabase();
    const attachments = files.map((file) => ({
      id: createAttachmentId(),
      name: file.name,
      size: file.size,
      type: file.type,
      blob: file,
    }));

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(ATTACHMENT_STORE, 'readwrite');
      const store = transaction.objectStore(ATTACHMENT_STORE);
      attachments.forEach((attachment) => store.put(attachment));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Unable to save the attachment.'));
      transaction.onabort = () => reject(transaction.error || new Error('Attachment storage was interrupted.'));
    });
    database.close();

    return attachments.map(({ id, name, size, type }) => ({ id, name, size, type }));
  } catch {
    return saveWithDataUrls(files);
  }
};

export const loadBugAttachment = async (attachment) => {
  if (attachment.dataUrl) return { url: attachment.dataUrl, revoke: false };
  if (!attachment.id || !window.indexedDB) return null;

  const database = await openAttachmentDatabase();
  const storedAttachment = await new Promise((resolve, reject) => {
    const transaction = database.transaction(ATTACHMENT_STORE, 'readonly');
    const request = transaction.objectStore(ATTACHMENT_STORE).get(attachment.id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to load the attachment.'));
  });
  database.close();

  if (!storedAttachment?.blob) return null;
  if (typeof URL.createObjectURL === 'function') {
    return { url: URL.createObjectURL(storedAttachment.blob), revoke: true };
  }

  return { url: await fileToDataUrl(storedAttachment.blob), revoke: false };
};

export const deleteBugAttachments = async (attachments = []) => {
  const attachmentIds = attachments.map((attachment) => attachment.id).filter(Boolean);
  if (attachmentIds.length === 0 || !window.indexedDB) return;

  try {
    const database = await openAttachmentDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(ATTACHMENT_STORE, 'readwrite');
      const store = transaction.objectStore(ATTACHMENT_STORE);
      attachmentIds.forEach((attachmentId) => store.delete(attachmentId));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Unable to delete attachments.'));
      transaction.onabort = () => reject(transaction.error || new Error('Attachment cleanup was interrupted.'));
    });
    database.close();
  } catch {
    // The bug can still be removed if browser file cleanup is unavailable.
  }
};
