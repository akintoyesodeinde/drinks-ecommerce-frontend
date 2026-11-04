import React from 'react';

interface CheckoutStepsProps {
  currentStep: 1 | 2 | 3;
  onStepClick?: (step: 1 | 2 | 3) => void;
}

const STEPS: { step: 1 | 2 | 3; label: string }[] = [
  { step: 1, label: '1. Fulfilment Method' },
  { step: 2, label: '2. Delivery / Pickup Details' },
  { step: 3, label: '3. Review & Pay' },
];

export const CheckoutSteps: React.FC<CheckoutStepsProps> = ({
  currentStep,
  onStepClick,
}) => {
  return (
    <nav aria-label="Checkout progress" className="mb-4">
      <ol className="nav nav-pills nav-fill gap-2 bg-light p-2 rounded border">
        {STEPS.map(({ step, label }) => {
          const isActive = currentStep === step;
          const isCompleted = currentStep > step;
          return (
            <li key={step} className="nav-item">
              <button
                type="button"
                className={`nav-link w-100 fw-semibold ${
                  isActive
                    ? 'active bg-success text-white'
                    : isCompleted
                      ? 'text-success bg-white border'
                      : 'text-muted disabled'
                }`}
                disabled={!isCompleted || !onStepClick}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => isCompleted && onStepClick && onStepClick(step)}
              >
                {isCompleted && <i className="bi bi-check-circle-fill me-1" aria-hidden="true" />}
                {label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
