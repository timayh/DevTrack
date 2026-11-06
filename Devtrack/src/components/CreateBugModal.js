import {
  ArrowDown,
  ArrowUp,
  Bug,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Code2,
  FolderOpen,
  Globe2,
  Image,
  Minus,
  Plus,
  ServerCog,
  Shapes,
  Smartphone,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import '../styles/CreateBugModal.css';
import { saveBug } from '../utils/bugStorage';

const projectTypeIcons = {
  'software-development': Code2,
  'mobile-application': Smartphone,
  'api-service': ServerCog,
  website: Globe2,
  other: Shapes,
};

const priorityIcons = {
  High: ArrowUp,
  Medium: Minus,
  Low: ArrowDown,
  Critical: CircleAlert,
};

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
  const firstInputRef = useRef(null);
  const selectedProject = projects.find((project) => project.id === form.projectId);
  const ProjectIcon = projectTypeIcons[selectedProject?.type] || Shapes;
  const PriorityIcon = priorityIcons[form.priority] || ArrowUp;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstInputRef.current?.focus();

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

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

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const bug = saveBug({
      projectId: selectedProject.id,
      projectKey: selectedProject.key,
      projectName: selectedProject.name,
      reporterId: currentUser.id,
      reporterName: currentUser.fullName,
      assigneeId: currentUser.id,
      assigneeName: currentUser.fullName,
      title: form.title.trim(),
      description: form.description.trim(),
      stepsToReproduce: form.stepsToReproduce.trim(),
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || null,
      attachments: attachments.map(({ name, size, type }) => ({ name, size, type })),
    });

    onBugCreated(bug);
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
                <div className={`bug-select-with-icon ${errors.projectId ? 'has-error' : ''}`}>
                  <span className={`bug-project-type-icon bug-project-type-${selectedProject?.type || 'other'}`}>
                    <ProjectIcon aria-hidden="true" />
                  </span>
                  <select id="bugProject" name="projectId" value={form.projectId} onChange={updateField} disabled={projects.length === 0}>
                    {projects.length === 0
                      ? <option value="">No projects available</option>
                      : projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" />
                </div>
                {errors.projectId && <small className="bug-field-error">{errors.projectId}</small>}
                {projects.length === 0 && <small>Create a project before reporting a bug.</small>}
              </div>

              <div className="bug-form-field">
                <label htmlFor="bugPriority">Priority <span>*</span></label>
                <div className={`bug-select-with-icon bug-priority-select priority-${form.priority.toLowerCase()}`}>
                  <PriorityIcon aria-hidden="true" />
                  <select id="bugPriority" name="priority" value={form.priority} onChange={updateField}>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </div>
              </div>

              <div className="bug-form-field">
                <label htmlFor="bugStatus">Status</label>
                <div className="bug-select-with-icon bug-status-select">
                  <FolderOpen aria-hidden="true" />
                  <select id="bugStatus" name="status" value={form.status} onChange={updateField}>
                    <option value="New">New</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Reopened">Reopened</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </div>
              </div>

              <div className="bug-form-field">
                <label htmlFor="bugAssignee">Assignee</label>
                <div className="bug-select-with-icon bug-assignee-select">
                  <span>{currentUser.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                  <select id="bugAssignee" value={currentUser.id} disabled>
                    <option value={currentUser.id}>{currentUser.fullName}</option>
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
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="create-bug-submit" type="submit" disabled={projects.length === 0}>
              <Plus /> Create Bug
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CreateBugModal;
