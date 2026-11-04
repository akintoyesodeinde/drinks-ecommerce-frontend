import React from 'react';
import { humanizeEnum } from '../../utils/format';

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

const STATUS_COLOR_MAP: Record<string, string> = {
  // OrderStatus & PaymentStatus & DeliveryStatus & StockStatus & RefundStatus
  Confirmed: 'success',
  Delivered: 'success',
  Successful: 'success',
  InStock: 'success',
  Processed: 'success',
  Resolved: 'success',

  PendingPayment: 'warning',
  Pending: 'warning',
  Initialized: 'info',
  Processing: 'primary',
  ReadyForDispatch: 'info',
  Assigned: 'info',
  AwaitingDispatch: 'warning',
  OutForDelivery: 'primary',
  LowStock: 'warning',
  CancellationRequested: 'warning',
  RefundPending: 'warning',
  PartiallyRefunded: 'info',
  Requested: 'warning',
  NeedsAttention: 'danger',
  Open: 'danger',

  Cancelled: 'secondary',
  Abandoned: 'secondary',
  NotScheduled: 'secondary',
  Returned: 'secondary',

  Failed: 'danger',
  DeliveryFailed: 'danger',
  FailedAttempt: 'danger',
  OutOfStock: 'danger',
  Reversed: 'dark',
  Refunded: 'secondary',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  if (!status) return null;
  const color = STATUS_COLOR_MAP[status] || 'secondary';
  return (
    <span className={`badge text-bg-${color} ${className}`}>
      {humanizeEnum(status)}
    </span>
  );
};
