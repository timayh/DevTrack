import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import '../styles/CustomSelect.css';

const CustomSelect = ({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];
  const SelectedIcon = selectedOption?.icon;

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`custom-select ${className}`.trim()} ref={wrapperRef}>
      <button
        className="custom-select-trigger"
        id={id}
        type="button"
        aria-label={`${ariaLabel}: ${selectedOption?.label || ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {SelectedIcon && (
          <span className={`custom-select-icon ${selectedOption.iconClass || ''}`.trim()}>
            <SelectedIcon aria-hidden="true" />
          </span>
        )}
        <span className="custom-select-value">{selectedOption?.label || ''}</span>
        <ChevronDown className="custom-select-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="custom-select-options" id={`${id}-options`} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const OptionIcon = option.icon;
            const selected = option.value === value;

            return (
              <button
                className={selected ? 'is-selected' : ''}
                type="button"
                role="option"
                aria-selected={selected}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {OptionIcon && (
                  <span className={`custom-select-icon ${option.iconClass || ''}`.trim()}>
                    <OptionIcon aria-hidden="true" />
                  </span>
                )}
                <span>{option.label}</span>
                {selected && <Check className="custom-select-check" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
