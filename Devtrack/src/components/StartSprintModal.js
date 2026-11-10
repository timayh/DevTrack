import { CalendarDays, Play, Target, TimerReset, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import '../styles/StartSprintModal.css';
import { notifyProjectMembers } from '../utils/notificationStorage';
import { startProjectSprint } from '../utils/projectStorage';

const StartSprintModal = ({ project, currentUser, onClose, onSprintStarted }) => {
  const [form, setForm] = useState({
    name: `Sprint ${(project.sprints?.length || 0) + 1}`,
    goal: '',
    startDate: '',
    endDate: '',
  });
  const [errors, setErrors] = useState({});
  const firstInputRef = useRef(null);

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
    setErrors((current) => ({ ...current, [name]: '', submit: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Sprint name is required.';
    if (!form.startDate) nextErrors.startDate = 'Start date is required.';
    if (!form.endDate) nextErrors.endDate = 'End date is required.';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = 'End date must be on or after the start date.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const result = startProjectSprint(project.id, form, currentUser.id);
    if (!result) {
      setErrors({ submit: 'The sprint could not be started. Check that no other sprint is active.' });
      return;
    }

    notifyProjectMembers({
      project: result.project,
      actor: currentUser,
      message: `${currentUser.nickname || currentUser.fullName} started ${result.sprint.name}`,
      detail: `${project.name} · ${result.sprint.startDate} to ${result.sprint.endDate}`,
    });

    onSprintStarted(result);
  };

  return (
    <div
      className="sprint-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="sprint-modal" role="dialog" aria-modal="true" aria-labelledby="start-sprint-title">
        <header className="sprint-modal-header">
          <span className="sprint-modal-icon" aria-hidden="true"><TimerReset /></span>
          <div>
            <h2 id="start-sprint-title">Start a Sprint</h2>
            <p>Set a focused timeline for {project.name}.</p>
          </div>
          <button className="sprint-modal-close" type="button" aria-label="Close start sprint dialog" onClick={onClose}>
            <X />
          </button>
        </header>

        <form className="sprint-form" onSubmit={handleSubmit} noValidate>
          <div className="sprint-form-field">
            <label htmlFor="sprintName">Sprint name <span>*</span></label>
            <input
              ref={firstInputRef}
              id="sprintName"
              name="name"
              type="text"
              value={form.name}
              onChange={updateField}
              className={errors.name ? 'has-error' : ''}
              aria-describedby={errors.name ? 'sprintName-error' : undefined}
            />
            {errors.name && <small className="sprint-field-error" id="sprintName-error">{errors.name}</small>}
          </div>

          <div className="sprint-form-field">
            <label htmlFor="sprintGoal">Sprint goal</label>
            <div className="sprint-input-with-icon sprint-goal-input">
              <Target aria-hidden="true" />
              <textarea
                id="sprintGoal"
                name="goal"
                placeholder="What should the team accomplish in this sprint?"
                value={form.goal}
                onChange={updateField}
              />
            </div>
          </div>

          <div className="sprint-date-grid">
            <div className="sprint-form-field">
              <label htmlFor="sprintStartDate">Start date <span>*</span></label>
              <div className={`sprint-input-with-icon ${errors.startDate ? 'has-error' : ''}`}>
                <CalendarDays aria-hidden="true" />
                <input
                  id="sprintStartDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={updateField}
                  aria-describedby={errors.startDate ? 'sprintStartDate-error' : undefined}
                />
              </div>
              {errors.startDate && <small className="sprint-field-error" id="sprintStartDate-error">{errors.startDate}</small>}
            </div>

            <div className="sprint-form-field">
              <label htmlFor="sprintEndDate">End date <span>*</span></label>
              <div className={`sprint-input-with-icon ${errors.endDate ? 'has-error' : ''}`}>
                <CalendarDays aria-hidden="true" />
                <input
                  id="sprintEndDate"
                  name="endDate"
                  type="date"
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={updateField}
                  aria-describedby={errors.endDate ? 'sprintEndDate-error' : undefined}
                />
              </div>
              {errors.endDate && <small className="sprint-field-error" id="sprintEndDate-error">{errors.endDate}</small>}
            </div>
          </div>

          {errors.submit && <p className="sprint-submit-error" role="alert">{errors.submit}</p>}

          <footer className="sprint-form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit"><Play /> Start Sprint</button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default StartSprintModal;
