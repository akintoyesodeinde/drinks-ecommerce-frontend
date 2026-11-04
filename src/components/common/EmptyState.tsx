import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'bi-inbox',
  title,
  description,
  action,
}) => {
  return (
    <div className="text-center py-5 px-3 bg-light rounded-3 border my-3">
      <i className={`bi ${icon} display-5 text-secondary d-block mb-3`} aria-hidden="true" />
      <h3 className="h5 fw-bold">{title}</h3>
      {description && <p className="text-muted mb-3 mx-auto" style={{ maxWidth: 460 }}>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
