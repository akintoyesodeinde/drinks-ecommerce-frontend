import React, { useId } from 'react';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helpText?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, helpText, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helpId = `${inputId}-help`;

    return (
      <div className="mb-3">
        <label htmlFor={inputId} className="form-label fw-medium">
          {label}
          {rest.required && <span className="text-danger ms-1">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helpText ? helpId : undefined}
          className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
          {...rest}
        />
        {error && (
          <div id={errorId} className="invalid-feedback d-block" role="alert">
            {error}
          </div>
        )}
        {!error && helpText && (
          <div id={helpId} className="form-text">
            {helpText}
          </div>
        )}
      </div>
    );
  },
);
TextField.displayName = 'TextField';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, placeholder, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div className="mb-3">
        <label htmlFor={selectId} className="form-label fw-medium">
          {label}
          {rest.required && <span className="text-danger ms-1">*</span>}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`form-select ${error ? 'is-invalid' : ''} ${className}`}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <div id={errorId} className="invalid-feedback d-block" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  },
);
SelectField.displayName = 'SelectField';

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const areaId = id || generatedId;
    const errorId = `${areaId}-error`;

    return (
      <div className="mb-3">
        <label htmlFor={areaId} className="form-label fw-medium">
          {label}
          {rest.required && <span className="text-danger ms-1">*</span>}
        </label>
        <textarea
          ref={ref}
          id={areaId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
          {...rest}
        />
        {error && (
          <div id={errorId} className="invalid-feedback d-block" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  },
);
TextAreaField.displayName = 'TextAreaField';
