import React from 'react';
import { ApiError } from '../../api/client';

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  const resolvedMessage =
    message ||
    (error instanceof ApiError
      ? error.detail
      : error instanceof Error
        ? error.message
        : 'An unexpected error occurred. Please try again.');

  return (
    <div className="alert alert-danger d-flex flex-column align-items-start gap-2 my-3" role="alert">
      <div className="fw-bold">
        <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
        {title}
      </div>
      <div>{resolvedMessage}</div>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
};
