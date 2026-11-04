import React from 'react';
import { formatLagosDateTime, humanizeEnum } from '../../utils/format';
import type { StatusHistoryDto, TrackingStepDto } from '../../types/api';

interface OrderTimelineProps {
  history: StatusHistoryDto[];
  steps?: TrackingStepDto[];
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ history, steps }) => {
  return (
    <div>
      {steps && steps.length > 0 && (
        <div className="mb-4">
          <div className="d-flex flex-wrap justify-content-between gap-2">
            {steps.map((step, index) => {
              const badgeClass = step.completed
                ? 'bg-success text-white'
                : step.current
                  ? 'bg-primary text-white'
                  : 'bg-light text-muted border';
              return (
                <div
                  key={step.key}
                  className="d-flex flex-column align-items-center text-center flex-fill p-2 rounded border bg-white"
                  style={{ minWidth: 120 }}
                >
                  <div
                    className={`rounded-circle d-flex align-items-center justify-content-center mb-2 ${badgeClass}`}
                    style={{ width: 36, height: 36 }}
                  >
                    {step.completed ? (
                      <i className="bi bi-check-lg" aria-hidden="true" />
                    ) : (
                      <span className="fw-bold small">{index + 1}</span>
                    )}
                  </div>
                  <div className="fw-semibold small">{step.label}</div>
                  {step.occurredAt && (
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {formatLagosDateTime(step.occurredAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <ul className="list-group list-group-flush border rounded">
          {history.map((item, idx) => (
            <li
              key={`${item.status}-${item.createdAt}-${idx}`}
              className="list-group-item d-flex justify-content-between align-items-start"
            >
              <div>
                <div className="fw-semibold">{humanizeEnum(item.status)}</div>
                {item.note && <div className="text-muted small">{item.note}</div>}
                {item.actor && (
                  <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                    By {item.actor}
                  </div>
                )}
              </div>
              <span className="text-muted small text-nowrap ms-3">
                {formatLagosDateTime(item.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
