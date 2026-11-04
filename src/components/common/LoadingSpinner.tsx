import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading...',
  fullPage = false,
}) => {
  return (
    <div
      className={`d-flex flex-column align-items-center justify-content-center ${
        fullPage ? 'py-5 my-5' : 'py-4'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="spinner-border text-success mb-2" aria-hidden="true" />
      <span className="text-muted small">{label}</span>
    </div>
  );
};
