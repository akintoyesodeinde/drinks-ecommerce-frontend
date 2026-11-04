import React from 'react';
import { formatNaira } from '../../utils/format';

interface PriceProps {
  amount: number;
  compareAtAmount?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Price: React.FC<PriceProps> = ({
  amount,
  compareAtAmount,
  className = '',
  size = 'md',
}) => {
  const sizeClass =
    size === 'lg' ? 'fs-4 fw-bold' : size === 'sm' ? 'small fw-semibold' : 'fw-bold';

  return (
    <span className={`d-inline-flex align-items-baseline gap-2 ${className}`}>
      <span className={`${sizeClass} text-success`}>{formatNaira(amount)}</span>
      {compareAtAmount !== null &&
        compareAtAmount !== undefined &&
        compareAtAmount > amount && (
          <del className="text-muted small">{formatNaira(compareAtAmount)}</del>
        )}
    </span>
  );
};
