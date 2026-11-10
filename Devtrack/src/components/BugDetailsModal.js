import {
  ArrowDown,
  ArrowUp,
  Bug,
  CalendarDays,
  CircleCheckBig,
  CircleAlert,
  ExternalLink,
  FileText,
  Folder,
  Image as ImageIcon,
  MessageCircle,
  Minus,
  Paperclip,
  RefreshCcw,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CustomSelect from './CustomSelect';
import '../styles/BugDetailsModal.css';
import { deleteBugAttachments, loadBugAttachment } from '../utils/attachmentStorage';
import {
  addBugComment,
  deleteStoredBug,
  updateBugWorkflow,
} from '../utils/bugStorage';
import { notifyBugActivity } from '../utils/notificationStorage';
import { readStoredProjects } from '../utils/projectStorage';

const priorityIcons = {
  Critical: CircleAlert,
  High: ArrowUp,
  Medium: Minus,
  Low: ArrowDown,
};

const priorityOptions = [
  { value: 'Critical', label: 'Critical', icon: CircleAlert, iconClass: 'select-icon-critical' },
  { value: 'High', label: 'High', icon: ArrowUp, iconClass: 'select-icon-high' },
  { value: 'Medium', label: 'Medium', icon: Minus, iconClass: 'select-icon-medium' },
  { value: 'Low', label: 'Low', icon: ArrowDown, iconClass: 'select-icon-low' },
];

const statusOptions = [
  { value: 'New', label: 'New', icon: Folder, iconClass: 'select-icon-new' },
  { value: 'Assigned', label: 'Assigned', icon: UserRoundCheck, iconClass: 'select-icon-assigned' },
  { value: 'In Progress', label: 'In Progress', icon: RefreshCcw, iconClass: 'select-icon-in-progress' },
  { value: 'Reopened', label: 'Reopened', icon: RotateCcw, iconClass: 'select-icon-reopened' },
  { value: 'Closed', label: 'Closed', icon: CircleCheckBig, iconClass: 'select-icon-closed' },
];

const getInitials = (name = 'DevTrack User') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

const formatDate = (date, fallback = 'Not set') => {
  if (!date) return fallback;

  return new Date(date.includes?.('T') ? date : `${date}T00:00:00`).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(date.includes?.('T') ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
};

const formatFileSize = (size = 0) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageAttachment = (attachment) => (
  attachment.type?.startsWith('image/')
  || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.name || '')
);

const getEmbeddedAttachmentPreviews = (attachments = []) => attachments
  .filter((attachment) => attachment.dataUrl)
  .map((attachment) => ({
    ...attachment,
    url: attachment.dataUrl,
    isImage: isImageAttachment(attachment),
  }));

const BugDetailsModal = ({
  bug,
  currentUser,
  canEditWorkflow = false,
  canDelete = false,
  onClose,
  onBugUpdated,
  onBugDeleted,
}) => {
  const [currentBug, setCurrentBug] = useState(bug);
  const [comment, setComment] = useState('');
  const [attachmentPreviews, setAttachmentPreviews] = useState(() => (
    getEmbeddedAttachmentPreviews(bug.attachments)
  ));
  const [attachmentsLoading, setAttachmentsLoading] = useState(() => (
    Boolean(bug.attachments?.some((attachment) => !attachment.dataUrl))
  ));
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const controlsMenuRef = useRef(null);
  const comments = currentBug.comments || [];
  const PriorityIcon = priorityIcons[currentBug.priority] || CircleAlert;
  const priority = currentBug.priority || 'High';
  const status = currentBug.status || 'New';
  const statusClass = status.toLowerCase().replaceAll(' ', '-');
  const project = readStoredProjects().find((item) => item.id === currentBug.projectId);
  const actorName = currentUser.nickname || currentUser.fullName;
  const notificationDetail = `${currentBug.title} · ${project?.name || currentBug.projectName || 'Unknown project'}`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;

      if (controlsOpen) {
        setControlsOpen(false);
        setDeleteConfirmationOpen(false);
        return;
      }

      onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [controlsOpen, onClose]);

  useEffect(() => {
    if (!controlsOpen) return undefined;

    const closeControls = (event) => {
      if (!controlsMenuRef.current?.contains(event.target)) {
        setControlsOpen(false);
        setDeleteConfirmationOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeControls);
    return () => document.removeEventListener('pointerdown', closeControls);
  }, [controlsOpen]);

  useEffect(() => {
    const attachments = currentBug.attachments || [];
    if (attachments.length === 0) {
      return undefined;
    }

    if (attachments.every((attachment) => attachment.dataUrl)) return undefined;

    let cancelled = false;
    const objectUrls = [];
    setAttachmentsLoading(true);

    Promise.all(attachments.map(async (attachment) => {
      try {
        const source = await loadBugAttachment(attachment);
        if (source?.revoke) objectUrls.push(source.url);
        return {
          ...attachment,
          url: source?.url || '',
          isImage: isImageAttachment(attachment),
        };
      } catch {
        return { ...attachment, url: '', isImage: isImageAttachment(attachment) };
      }
    })).then((previews) => {
      if (cancelled) {
        objectUrls.forEach((url) => URL.revokeObjectURL?.(url));
        return;
      }

      setAttachmentPreviews(previews);
      setAttachmentsLoading(false);
    });

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL?.(url));
    };
  }, [currentBug.attachments]);

  const submitComment = (event) => {
    event.preventDefault();
    if (!comment.trim()) return;

    const updatedBug = addBugComment(currentBug.storageId || currentBug.id, {
      userId: currentUser.id,
      authorName: currentUser.nickname || currentUser.fullName,
      body: comment,
    });

    if (!updatedBug) return;
    setCurrentBug(updatedBug);
    setComment('');
    notifyBugActivity({
      project,
      bug: updatedBug,
      actor: currentUser,
      selfMessage: `You commented on bug ${updatedBug.id}`,
      teamMessage: `${actorName} commented on bug ${updatedBug.id}`,
      detail: notificationDetail,
      category: 'comment',
    });
    onBugUpdated?.(updatedBug);
  };

  const changeWorkflowField = (field, value) => {
    if (!canEditWorkflow) return;
    const previousValue = currentBug[field];
    if (previousValue === value) return;

    const updatedBug = updateBugWorkflow(currentBug.storageId || currentBug.id, { [field]: value });
    if (!updatedBug) return;
    setCurrentBug(updatedBug);
    notifyBugActivity({
      project,
      bug: updatedBug,
      actor: currentUser,
      selfMessage: `You changed ${updatedBug.id} ${field} to ${value}`,
      teamMessage: `${actorName} changed ${updatedBug.id} ${field} to ${value}`,
      detail: `${updatedBug.title} · Previously ${previousValue}`,
    });
    onBugUpdated?.(updatedBug);
  };

  const deleteBug = async () => {
    if (!canDelete || isDeleting) return;

    setIsDeleting(true);
    await deleteBugAttachments(currentBug.attachments);
    const deleted = deleteStoredBug(currentBug.storageId || currentBug.id);

    if (deleted) {
      notifyBugActivity({
        project,
        bug: currentBug,
        actor: currentUser,
        selfMessage: `You deleted bug ${currentBug.id}`,
        teamMessage: `${actorName} deleted bug ${currentBug.id}`,
        detail: notificationDetail,
      });
      onBugDeleted?.(currentBug);
      return;
    }

    setIsDeleting(false);
  };

  return (
    <div
      className="bug-details-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="bug-details-modal" role="dialog" aria-modal="true" aria-labelledby="bug-details-title">
        <header className="bug-details-header">
          <span className="bug-details-header-icon" aria-hidden="true"><Bug /></span>
          <div>
            <span>{currentBug.id}</span>
            <h2 id="bug-details-title">{currentBug.title}</h2>
          </div>
          <div className="bug-details-header-labels">
            <span className={`table-pill priority-${priority.toLowerCase()}`}>
              <PriorityIcon aria-hidden="true" /> {priority}
            </span>
            <span className={`table-pill status-${statusClass}`}>{status}</span>
          </div>
          <div className="bug-details-header-actions">
            {(canEditWorkflow || canDelete) && (
              <div className="bug-controls-menu" ref={controlsMenuRef}>
                <button
                  className="bug-controls-trigger"
                  type="button"
                  aria-label="Open bug controls"
                  aria-expanded={controlsOpen}
                  aria-controls="bug-controls-dropdown"
                  onClick={() => {
                    setControlsOpen((current) => !current);
                    setDeleteConfirmationOpen(false);
                  }}
                >
                  <Settings2 />
                </button>

                {controlsOpen && (
                  <section
                    className="bug-controls-dropdown"
                    id="bug-controls-dropdown"
                    aria-labelledby="bug-controls-title"
                  >
                    <header>
                      <span><ShieldCheck /></span>
                      <div>
                        <h3 id="bug-controls-title">Bug controls</h3>
                        <p>
                          {canEditWorkflow && canDelete && 'Update the workflow or permanently remove this bug.'}
                          {canEditWorkflow && !canDelete && 'As the assignee, you can update this bug’s workflow.'}
                          {!canEditWorkflow && canDelete && 'As the bug creator, you can permanently remove this report.'}
                        </p>
                      </div>
                    </header>

                    {canEditWorkflow && (
                      <div className="bug-workflow-fields">
                        <div>
                          <span>Priority</span>
                          <CustomSelect
                            id="bugDetailsPriority"
                            ariaLabel="Change bug priority"
                            value={priority}
                            options={priorityOptions}
                            onChange={(value) => changeWorkflowField('priority', value)}
                            className="custom-select-compact"
                          />
                        </div>
                        <div>
                          <span>Status</span>
                          <CustomSelect
                            id="bugDetailsStatus"
                            ariaLabel="Change bug status"
                            value={status}
                            options={statusOptions}
                            onChange={(value) => changeWorkflowField('status', value)}
                            className="custom-select-compact"
                          />
                        </div>
                      </div>
                    )}

                    {canDelete && (!deleteConfirmationOpen ? (
                      <button className="bug-delete-button" type="button" onClick={() => setDeleteConfirmationOpen(true)}>
                        <Trash2 /> Delete bug
                      </button>
                    ) : (
                      <div className="bug-delete-confirmation" role="alert">
                        <div><strong>Delete this bug?</strong><span>This cannot be undone.</span></div>
                        <button type="button" onClick={() => setDeleteConfirmationOpen(false)} disabled={isDeleting}>Cancel</button>
                        <button type="button" onClick={deleteBug} disabled={isDeleting}>
                          {isDeleting ? 'Deleting...' : 'Confirm delete'}
                        </button>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            )}
            <button ref={closeButtonRef} className="bug-details-close" type="button" aria-label="Close bug details" onClick={onClose}>
              <X />
            </button>
          </div>
        </header>

        <div className="bug-details-layout">
          <div className="bug-details-main">
            <section>
              <h3>Description</h3>
              <p>{currentBug.description || 'No description was provided.'}</p>
            </section>

            <section>
              <h3>Steps to reproduce</h3>
              <p className="bug-steps-copy">{currentBug.stepsToReproduce || 'No reproduction steps were provided.'}</p>
            </section>

            <section className="bug-details-attachments">
              <h3>Attachments</h3>
              {attachmentsLoading ? <p>Loading attachments...</p> : attachmentPreviews.length > 0 ? (
                <ul className="bug-attachment-grid">
                  {attachmentPreviews.map((attachment, index) => (
                    <li key={attachment.id || `${attachment.name}-${index}`}>
                      {attachment.url ? (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open attachment ${attachment.name}`}
                        >
                          {attachment.isImage ? (
                            <span className="bug-attachment-preview">
                              <img src={attachment.url} alt={`Preview of ${attachment.name}`} />
                            </span>
                          ) : (
                            <span className="bug-attachment-file-icon"><FileText /></span>
                          )}
                          <span className="bug-attachment-info">
                            <strong>{attachment.name}</strong>
                            <small>{formatFileSize(attachment.size)}</small>
                          </span>
                          <ExternalLink className="bug-attachment-open-icon" aria-hidden="true" />
                        </a>
                      ) : (
                        <div className="bug-attachment-unavailable">
                          {attachment.isImage ? <ImageIcon /> : <Paperclip />}
                          <span><strong>{attachment.name}</strong><small>Preview unavailable</small></span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : <p>No attachments.</p>}
            </section>

            <dl className="bug-details-metadata">
              <div><dt><Folder /> Project</dt><dd>{currentBug.projectName || 'Unknown project'}</dd></div>
              <div><dt><UserRound /> Assignee</dt><dd>{currentBug.assigneeName || 'Unassigned'}</dd></div>
              <div><dt><UserRound /> Reporter</dt><dd>{currentBug.reporterName || 'Unknown'}</dd></div>
              <div><dt><CalendarDays /> Due date</dt><dd>{formatDate(currentBug.dueDate)}</dd></div>
            </dl>

          </div>

          <aside className="bug-comments" aria-labelledby="bug-comments-title">
            <header>
              <div>
                <MessageCircle aria-hidden="true" />
                <h3 id="bug-comments-title">Comments</h3>
              </div>
              <span>{comments.length}</span>
            </header>

            <div className="bug-comments-list" aria-live="polite">
              {comments.length > 0 ? comments.map((savedComment) => (
                <article key={savedComment.id}>
                  <span className="bug-comment-avatar">{getInitials(savedComment.authorName)}</span>
                  <div>
                    <header><strong>{savedComment.authorName}</strong><time>{formatDate(savedComment.createdAt)}</time></header>
                    <p>{savedComment.body}</p>
                  </div>
                </article>
              )) : (
                <div className="bug-comments-empty">
                  <MessageCircle />
                  <strong>No comments yet</strong>
                  <p>Start the conversation about this bug.</p>
                </div>
              )}
            </div>

            <form className="bug-comment-form" onSubmit={submitComment}>
              <label htmlFor="bugComment">Add a comment</label>
              <textarea
                id="bugComment"
                placeholder="Write a comment..."
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <button type="submit" disabled={!comment.trim()}><Send /> Post comment</button>
            </form>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default BugDetailsModal;
