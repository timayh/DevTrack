import { Bug, CalendarClock, CalendarDays, Folder, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import '../styles/DeadlinesModal.css';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'project', label: 'Projects' },
  { value: 'bug', label: 'Bugs' },
];

const DeadlinesModal = ({ deadlines, onClose, onOpenDeadline }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const filteredDeadlines = useMemo(() => deadlines.filter((deadline) => (
    activeFilter === 'all' || deadline.type === activeFilter
  )), [activeFilter, deadlines]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="deadlines-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="deadlines-modal" role="dialog" aria-modal="true" aria-labelledby="all-deadlines-title">
        <header className="deadlines-modal-header">
          <span className="deadlines-modal-icon" aria-hidden="true"><CalendarClock /></span>
          <div>
            <h2 id="all-deadlines-title">Upcoming Deadlines</h2>
            <p>Project milestones and unresolved bugs with due dates.</p>
          </div>
          <button type="button" aria-label="Close deadlines dialog" onClick={onClose}><X /></button>
        </header>

        <div className="deadlines-modal-toolbar">
          <div>
            <strong>{filteredDeadlines.length}</strong>
            <span>{filteredDeadlines.length === 1 ? 'deadline' : 'deadlines'}</span>
          </div>
          <div className="deadline-filters" aria-label="Filter deadlines">
            {filters.map((filter) => (
              <button
                className={activeFilter === filter.value ? 'is-active' : ''}
                type="button"
                key={filter.value}
                aria-pressed={activeFilter === filter.value}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
                <span>{filter.value === 'all'
                  ? deadlines.length
                  : deadlines.filter((deadline) => deadline.type === filter.value).length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="deadlines-modal-list" aria-live="polite">
          {filteredDeadlines.length > 0 ? filteredDeadlines.map((deadline) => {
            const DeadlineIcon = deadline.type === 'bug' ? Bug : Folder;
            return (
              <button
                type="button"
                key={deadline.id}
                aria-label={`Open ${deadline.type} deadline ${deadline.title}`}
                onClick={() => onOpenDeadline(deadline)}
              >
                <span className={`deadline-modal-item-icon deadline-modal-icon-${deadline.type}`}>
                  <DeadlineIcon aria-hidden="true" />
                </span>
                <span className="deadline-modal-copy">
                  <small>{deadline.type === 'bug' ? 'Bug deadline' : 'Project deadline'}</small>
                  <strong>{deadline.title}</strong>
                  <i>{deadline.subtitle}</i>
                </span>
                <span className="deadline-modal-date">
                  <span><CalendarDays aria-hidden="true" /> {deadline.date}</span>
                  <i className={`deadline-days deadline-${deadline.tone}`}>{deadline.days}</i>
                </span>
              </button>
            );
          }) : (
            <div className="deadlines-modal-empty">
              <CalendarClock />
              <strong>No {activeFilter === 'all' ? '' : `${activeFilter} `}deadlines</strong>
              <p>Deadlines will appear here when projects or unresolved bugs have due dates.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DeadlinesModal;
