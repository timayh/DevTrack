import {
  CalendarDays,
  ChevronDown,
  Code2,
  Folder,
  Globe2,
  Image,
  Plus,
  ServerCog,
  Shapes,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import '../styles/CreateProjectModal.css';
import { saveProject } from '../utils/projectStorage';

const initialForm = {
  name: '',
  key: '',
  description: '',
  type: 'software-development',
  startDate: '',
  endDate: '',
};

const projectTypes = [
  { value: 'software-development', label: 'Software Development', icon: Code2 },
  { value: 'mobile-application', label: 'Mobile Application', icon: Smartphone },
  { value: 'api-service', label: 'API Service', icon: ServerCog },
  { value: 'website', label: 'Website', icon: Globe2 },
  { value: 'other', label: 'Other', icon: Shapes },
];

const CreateProjectModal = ({ currentUser, existingProjects, onClose, onProjectCreated }) => {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const firstInputRef = useRef(null);
  const typeMenuRef = useRef(null);
  const selectedProjectType = projectTypes.find((type) => type.value === form.type) || projectTypes[0];
  const SelectedTypeIcon = selectedProjectType.icon;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstInputRef.current?.focus();

    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;

      if (typeMenuOpen) {
        setTypeMenuOpen(false);
      } else {
        onClose();
      }
    };

    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, typeMenuOpen]);

  useEffect(() => {
    if (!typeMenuOpen) return undefined;

    const closeTypeMenu = (event) => {
      if (!typeMenuRef.current?.contains(event.target)) setTypeMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeTypeMenu);
    return () => document.removeEventListener('pointerdown', closeTypeMenu);
  }, [typeMenuOpen]);

  const updateField = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'key' ? value.toUpperCase().replace(/\s/g, '') : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const addFiles = (fileList) => {
    const files = Array.from(fileList);
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

    if (!form.name.trim()) nextErrors.name = 'Project name is required.';
    if (!form.key.trim()) {
      nextErrors.key = 'Project key is required.';
    } else if (!/^[A-Z0-9-]+$/.test(form.key)) {
      nextErrors.key = 'Use letters, numbers, or hyphens only.';
    } else if (existingProjects.some((project) => project.key?.toLowerCase() === form.key.toLowerCase())) {
      nextErrors.key = 'This project key is already in use.';
    }
    if (!form.description.trim()) nextErrors.description = 'Project description is required.';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = 'End date must be after the start date.';
    }

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const project = saveProject({
      ownerId: currentUser.id,
      leadId: currentUser.id,
      leadName: currentUser.fullName,
      teamMemberIds: [],
      name: form.name.trim(),
      key: form.key.trim(),
      description: form.description.trim(),
      type: form.type,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      attachments: attachments.map(({ name, size, type }) => ({ name, size, type })),
    });

    onProjectCreated(project);
  };

  return (
    <div
      className="project-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
        <header className="project-modal-header">
          <span className="project-modal-icon" aria-hidden="true"><Folder /></span>
          <div>
            <h2 id="create-project-title">Create Project</h2>
            <p>Start a new project to organize and track your work.</p>
          </div>
          <button className="project-modal-close" type="button" aria-label="Close create project dialog" onClick={onClose}>
            <X />
          </button>
        </header>

        <form className="project-form" onSubmit={handleSubmit} noValidate>
          <div className="project-form-grid">
            <div className="project-form-column">
              <div className="project-form-field">
                <label htmlFor="projectName">Project Name <span>*</span></label>
                <input
                  ref={firstInputRef}
                  id="projectName"
                  name="name"
                  type="text"
                  placeholder="Enter a project name..."
                  value={form.name}
                  onChange={updateField}
                  aria-describedby={errors.name ? 'projectName-error' : undefined}
                  className={errors.name ? 'has-error' : ''}
                />
                {errors.name && <small className="project-field-error" id="projectName-error">{errors.name}</small>}
              </div>

              <div className="project-form-field">
                <label htmlFor="projectDescription">Description <span>*</span></label>
                <textarea
                  id="projectDescription"
                  name="description"
                  placeholder="Describe the project...&#10;Include the goals, scope, and what this project is for."
                  value={form.description}
                  onChange={updateField}
                  aria-describedby={errors.description ? 'projectDescription-error' : undefined}
                  className={errors.description ? 'has-error' : ''}
                />
                {errors.description && <small className="project-field-error" id="projectDescription-error">{errors.description}</small>}
              </div>

              <div className="project-form-field">
                <label htmlFor="projectStartDate">Start Date</label>
                <div className="project-input-with-icon">
                  <CalendarDays aria-hidden="true" />
                  <input id="projectStartDate" name="startDate" type="date" value={form.startDate} onChange={updateField} />
                </div>
              </div>

              <div className="project-form-field">
                <label htmlFor="projectMembers">Team Members</label>
                <div className="project-select-with-icon is-disabled">
                  <Users aria-hidden="true" />
                  <select id="projectMembers" disabled defaultValue="none">
                    <option value="none">No team members available yet</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </div>
                <small>Add team members after invitations are implemented.</small>
              </div>
            </div>

            <div className="project-form-column">
              <div className="project-form-field">
                <label htmlFor="projectKey">Project Key <span>*</span></label>
                <input
                  id="projectKey"
                  name="key"
                  type="text"
                  maxLength="10"
                  placeholder="E.g. WEB, API, MOBILE..."
                  value={form.key}
                  onChange={updateField}
                  aria-describedby={errors.key ? 'projectKey-error' : 'projectKey-help'}
                  className={errors.key ? 'has-error' : ''}
                />
                {errors.key
                  ? <small className="project-field-error" id="projectKey-error">{errors.key}</small>
                  : <small id="projectKey-help">A short key to identify the project (max 10 characters).</small>}
              </div>

              <div className="project-form-field">
                <label id="projectType-label">Project Type <span>*</span></label>
                <div className="project-type-picker" ref={typeMenuRef}>
                  <button
                    className="project-type-trigger"
                    type="button"
                    aria-label={`Project Type: ${selectedProjectType.label}`}
                    aria-haspopup="listbox"
                    aria-expanded={typeMenuOpen}
                    aria-controls="projectType-options"
                    onClick={() => setTypeMenuOpen((current) => !current)}
                  >
                    <span className={`project-type-icon project-type-icon-${selectedProjectType.value}`}>
                      <SelectedTypeIcon aria-hidden="true" />
                    </span>
                    <span>{selectedProjectType.label}</span>
                    <ChevronDown aria-hidden="true" />
                  </button>

                  {typeMenuOpen && (
                    <div
                      className="project-type-options"
                      id="projectType-options"
                      role="listbox"
                      aria-labelledby="projectType-label"
                    >
                      {projectTypes.map(({ value, label, icon: TypeIcon }) => (
                        <button
                          className={form.type === value ? 'is-selected' : ''}
                          type="button"
                          role="option"
                          aria-selected={form.type === value}
                          key={value}
                          onClick={() => {
                            setForm((current) => ({ ...current, type: value }));
                            setTypeMenuOpen(false);
                          }}
                        >
                          <span className={`project-type-icon project-type-icon-${value}`}>
                            <TypeIcon aria-hidden="true" />
                          </span>
                          <span>{label}</span>
                          {form.type === value && <span className="project-type-check" aria-hidden="true">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="project-form-field">
                <label htmlFor="projectEndDate">End Date</label>
                <div className={`project-input-with-icon ${errors.endDate ? 'has-error' : ''}`}>
                  <CalendarDays aria-hidden="true" />
                  <input
                    id="projectEndDate"
                    name="endDate"
                    type="date"
                    min={form.startDate || undefined}
                    value={form.endDate}
                    onChange={updateField}
                    aria-describedby={errors.endDate ? 'projectEndDate-error' : undefined}
                  />
                </div>
                {errors.endDate && <small className="project-field-error" id="projectEndDate-error">{errors.endDate}</small>}
              </div>

              <div className="project-form-field">
                <label htmlFor="projectLead">Project Lead</label>
                <div className="project-select-with-icon project-lead-select">
                  <span>{currentUser.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                  <select id="projectLead" value={currentUser.id} disabled>
                    <option value={currentUser.id}>{currentUser.fullName}</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </div>
                <small>The project creator is the lead for now.</small>
              </div>
            </div>
          </div>

          <div className="project-attachments">
            <label>Attachments</label>
            <label
              className="project-upload-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                addFiles(event.dataTransfer.files);
              }}
            >
              <Image aria-hidden="true" />
              <span>Drag and drop files here, or <strong>click to upload</strong></span>
              <small>Supports images, documents, and other files (max 10 MB)</small>
              <input type="file" multiple onChange={(event) => addFiles(event.target.files)} />
            </label>
            {attachmentError && <small className="project-field-error">{attachmentError}</small>}
            {attachments.length > 0 && (
              <ul className="project-file-list">
                {attachments.map((file) => (
                  <li key={`${file.name}-${file.size}`}>
                    <span>{file.name}</span>
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setAttachments((current) => current.filter((item) => item !== file))}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="project-modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="create-project-submit" type="submit"><Plus /> Create Project</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CreateProjectModal;
