import {
  ArrowDown,
  ArrowUp,
  Bug,
  CalendarDays,
  ChevronDown,
  CircleCheckBig,
  CircleAlert,
  Code2,
  FolderOpen,
  Globe2,
  Image,
  Minus,
  Plus,
  RefreshCcw,
  RotateCcw,
  ServerCog,
  Shapes,
  Smartphone,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CustomSelect from './CustomSelect';
import '../styles/CreateBugModal.css';
import { saveBugAttachments } from '../utils/attachmentStorage';
import { saveBug } from '../utils/bugStorage';
import { notifyBugActivity } from '../utils/notificationStorage';

const projectTypeIcons = {
  'software-development': Code2,
  'mobile-application': Smartphone,
  'api-service': ServerCog,
  website: Globe2,
  other: Shapes,
};

const projectTypeIconClasses = {
  'software-development': 'select-icon-software-development',
  'mobile-application': 'select-icon-mobile-application',
  'api-service': 'select-icon-api-service',
  website: 'select-icon-website',
  other: 'select-icon-other',
};

const priorities = [
  { value: 'Critical', icon: CircleAlert },
  { value: 'High', icon: ArrowUp },
  { value: 'Medium', icon: Minus },
  { value: 'Low', icon: ArrowDown },
];

const statusOptions = [
  { value: 'New', label: 'New', icon: FolderOpen, iconClass: 'select-icon-new' },
  { value: 'Assigned', label: 'Assigned', icon: UserRoundCheck, iconClass: 'select-icon-assigned' },
  { value: 'In Progress', label: 'In Progress', icon: RefreshCcw, iconClass: 'select-icon-in-progress' },
  { value: 'Reopened', label: 'Reopened', icon: RotateCcw, iconClass: 'select-icon-reopened' },
  { value: 'Closed', label: 'Closed', icon: CircleCheckBig, iconClass: 'select-icon-closed' },
];

const initialForm = {
  title: '',
  description: '',
  stepsToReproduce: '',
  projectId: '',
  priority: 'High',
  status: 'New',
  dueDate: '',
};

const CreateBugModal = ({ currentUser, projects, onClose, onBugCreated }) => {
  const [form, setForm] = useState(() => ({
    ...initialForm,
    projectId: projects[0]?.id || '',
  }));
  const [errors, setErrors] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const firstInputRef = useRef(null);
  const priorityMenuRef = useRef(null);
  const selectedProject = projects.find((project) => project.id === form.projectId);
  const projectOptions = projects.length > 0 ? projects.map((project) => ({
    value: project.id,
    label: project.name,
    icon: projectTypeIcons[project.type] || Shapes,
    iconClass: projectTypeIconClasses[project.type] || projectTypeIconClasses.other,
  })) : [{
    value: '',
    label: 'No projects available',
    icon: Shapes,
    iconClass: projectTypeIconClasses.other,
  }];
  const selectedPriority = priorities.find((priority) => priority.value === form.priority) || priorities[1];
  const PriorityIcon = selectedPriority.icon;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstInputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;

      if (priorityMenuOpen) {
        setPriorityMenuOpen(false);
        return;
      }

      onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, priorityMenuOpen]);

  useEffect(() => {
    if (!priorityMenuOpen) return undefined;

    const closePriorityMenu = (event) => {
      if (!priorityMenuRef.current?.contains(event.target)) setPriorityMenuOpen(false);
    };

    document.addEventListener('mousedown', closePriorityMenu);
    return () => document.removeEventListener('mousedown', closePriorityMenu);
  }, [priorityMenuOpen]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const oversizedFile = files.find((file) => file.size > 10 * 1024 * 1024);

    if (oversizedFile) {
      setAttachmentError(`${oversizedFile.name} is larger than 10 MB.`);
      return;
    }

    setAttachmentError('');
    setAttachments((current) => {
      const knownFiles = new Set(current.map((file) => `${file.name}-${file.size}`));
      return [...current, ...files.filter((file) => !knownFiles.has(`${file.name}-${file.size}`))];
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = 'Bug title is required.';
    if (!form.description.trim()) nextErrors.description = 'Bug description is required.';
    if (!form.projectId || !selectedProject) nextErrors.projectId = 'Select a project for this bug.';

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setAttachmentError('');

    try {
      const storedAttachments = await saveBugAttachments(attachments);
      const bug = saveBug({
        projectId: selectedProject.id,
        projectKey: selectedProject.key,
        projectName: selectedProject.name,
        reporterId: currentUser.id,
        reporterName: currentUser.nickname || currentUser.fullName,
        assigneeId: currentUser.id,
        assigneeName: currentUser.nickname || currentUser.fullName,
        title: form.title.trim(),
        description: form.description.trim(),
        stepsToReproduce: form.stepsToReproduce.trim(),
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || null,
        attachments: storedAttachments,
      });

      const actorName = currentUser.nickname || currentUser.fullName;
      notifyBugActivity({
        project: selectedProject,
        bug,
        actor: currentUser,
        selfMessage: `You created bug ${bug.id}`,
        teamMessage: `${actorName} created bug ${bug.id}`,
        detail: `${bug.title} · ${selectedProject.name}`,
      });

      onBugCreated(bug);
    } catch {
      setAttachmentError('The bug could not be saved. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="bug-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="bug-modal" role="dialog" aria-modal="true" aria-labelledby="create-bug-title">
        <header className="bug-modal-header">
          <span className="bug-modal-icon" aria-hidden="true"><Bug /></span>
          <div>
            <h2 id="create-bug-title">Create Bug</h2>
            <p>Report a new bug and add it to one of your projects.</p>
          </div>
          <button className="bug-modal-close" type="button" aria-label="Close create bug dialog" onClick={onClose}>
            <X />
          </button>
        </header>

        <form className="bug-form" onSubmit={handleSubmit} noValidate>
          <div className="bug-form-grid">
            <div className="bug-form-column">
              <div className="bug-form-field">
                <label htmlFor="bugTitle">Title <span>*</span></label>
                <input
                  ref={firstInputRef}
                  id="bugTitle"
                  name="title"
                  type="text"
                  placeholder="Enter a short, descriptive title..."
                  value={form.title}
                  onChange={updateField}
                  className={errors.title ? 'has-error' : ''}
                  aria-describedby={errors.title ? 'bugTitle-error' : undefined}
                />
                {errors.title && <small className="bug-field-error" id="bugTitle-error">{errors.title}</small>}
              </div>

              <div className="bug-form-field">
                <label htmlFor="bugDescription">Description <span>*</span></label>
                <textarea
                  id="bugDescription"
                  name="description"
                  placeholder="Describe the bug in detail...&#10;Include expected behavior and what actually happened."
                  value={form.description}
                  onChange={updateField}
                  className={errors.description ? 'has-error' : ''}
                  aria-describedby={errors.description ? 'bugDescription-error' : undefined}
                />
                {errors.description && <small className="bug-field-error" id="bugDescription-error">{errors.description}</small>}
              </div>

              <div className="bug-form-field">
                <label htmlFor="bugSteps">Steps to Reproduce</label>
                <textarea
                  className="bug-steps-input"
                  id="bugSteps"
                  name="stepsToReproduce"
                  placeholder={'1. Go to...\n2. Click on...\n3. See error...'}
                  value={form.stepsToReproduce}
                  onChange={updateField}
                />
              </div>

              <div className="bug-attachments">
                <label>Attachments</label>
                <label
                  className="bug-upload-zone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addFiles(event.dataTransfer.files);
                  }}
                >
                  <Image aria-hidden="true" />
                  <span>Drag and drop files here, or <strong>click to upload</strong></span>
                  <small>Supports images, videos, and documents (max 10 MB)</small>
                  <input type="file" multiple onChange={(event) => addFiles(event.target.files)} />
                </label>
                {attachmentError && <small className="bug-field-error">{attachmentError}</small>}
                {attachments.length > 0 && (
                  <ul className="bug-file-list">
                    {attachments.map((file) => (
                      <li key={`${file.name}-${file.size}`}>
                        <span>{file.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => setAttachments((current) => current.filter((item) => item !== file))}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="bug-form-column">
              <div className="bug-form-field">
                <label htmlFor="bugProject">Project <span>*</span></label>
                <CustomSelect
                  id="bugProject"
                  ariaLabel="Project"
                  value={form.projectId}
                  options={projectOptions}
                  disabled={projects.length === 0}
                  className={errors.projectId ? 'has-error' : ''}
                  onChange={(value) => {
                    setForm((current) => ({ ...current, projectId: value }));
                    setErrors((current) => ({ ...current, projectId: '' }));
                  }}
                />
                {errors.projectId && <small className="bug-field-error">{errors.projectId}</small>}
                {projects.length === 0 && <small>Create a project before reporting a bug.</small>}
              </div>

              <div className="bug-form-field">
                <label id="bugPriority-label" htmlFor="bugPriority">Priority <span>*</span></label>
                <div className="bug-priority-picker" ref={priorityMenuRef}>
                  <button
                    id="bugPriority"
                    className={`bug-priority-trigger bug-priority-${form.priority.toLowerCase()}`}
                    type="button"
                    aria-label={`Priority: ${selectedPriority.value}`}
                    aria-haspopup="listbox"
                    aria-expanded={priorityMenuOpen}
                    aria-controls="bugPriority-options"
                    onClick={() => setPriorityMenuOpen((current) => !current)}
                  >
                    <span className="bug-priority-icon"><PriorityIcon aria-hidden="true" /></span>
                    <span>{selectedPriority.value}</span>
                    <ChevronDown aria-hidden="true" />
                  </button>
                  {priorityMenuOpen && (
                    <div
                      className="bug-priority-options"
                      id="bugPriority-options"
                      role="listbox"
                      aria-labelledby="bugPriority-label"
                    >
                      {priorities.map(({ value, icon: Icon }) => (
                        <button
                          className={`bug-priority-option bug-priority-${value.toLowerCase()}${form.priority === value ? ' is-selected' : ''}`}
                          type="button"
                          role="option"
                          aria-selected={form.priority === value}
                          key={value}
                          onClick={() => {
                            setForm((current) => ({ ...current, priority: value }));
                            setPriorityMenuOpen(false);
                          }}
                        >
                          <span className="bug-priority-icon"><Icon aria-hidden="true" /></span>
                          <span>{value}</span>
                          {form.priority === value && <span className="bug-priority-check" aria-hidden="true">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bug-form-field">
                <label htmlFor="bugStatus">Status</label>
                <CustomSelect
                  id="bugStatus"
                  ariaLabel="Status"
                  value={form.status}
                  options={statusOptions}
                  onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                />
              </div>

              <div className="bug-form-field">
                <label htmlFor="bugAssignee">Assignee</label>
                <div className="bug-select-with-icon bug-assignee-select">
                  <span>{(currentUser.nickname || currentUser.fullName).split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                  <select id="bugAssignee" value={currentUser.id} disabled>
                    <option value={currentUser.id}>{currentUser.nickname || currentUser.fullName}</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </div>
                <small>More assignees will appear when team invitations are implemented.</small>
              </div>

              <div className="bug-form-field">
                <label htmlFor="bugDueDate">Due Date</label>
                <div className="bug-input-with-icon">
                  <CalendarDays aria-hidden="true" />
                  <input id="bugDueDate" name="dueDate" type="date" value={form.dueDate} onChange={updateField} />
                </div>
              </div>
            </div>
          </div>

          <div className="bug-modal-actions">
            <button type="button" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button className="create-bug-submit" type="submit" disabled={projects.length === 0 || isSaving}>
              <Plus /> {isSaving ? 'Saving...' : 'Create Bug'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CreateBugModal;
