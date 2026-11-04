import React from 'react';
import { formatNaira } from '../../utils/format';

interface CartSummaryProps {
  subtotal: number;
  discount: number;
  couponCode?: string | null;
  deliveryFee?: number | null;
  tax?: number | null;
  total: number;
  footerAction?: React.ReactNode;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  subtotal,
  discount,
  couponCode,
  deliveryFee,
  tax,
  total,
  footerAction,
}) => {
  return (
    <div className="card shadow-sm border-0 bg-light">
      <div className="card-body">
        <h5 className="card-title fw-bold mb-3">Order Summary</h5>
        <div className="d-flex justify-content-between mb-2">
          <span className="text-muted">Subtotal</span>
          <span className="fw-semibold" data-testid="summary-subtotal">
            {formatNaira(subtotal)}
          </span>
        </div>
        {discount > 0 && (
          <div className="d-flex justify-content-between mb-2 text-success">
            <span>
              Discount {couponCode ? `(${couponCode})` : ''}
            </span>
            <span className="fw-semibold" data-testid="summary-discount">
              -{formatNaira(discount)}
            </span>
          </div>
        )}
        {deliveryFee !== undefined && deliveryFee !== null && (
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Delivery Fee</span>
            <span className="fw-semibold" data-testid="summary-delivery-fee">
              {deliveryFee === 0 ? 'Free' : formatNaira(deliveryFee)}
            </span>
          </div>
        )}
        {tax !== undefined && tax !== null && tax > 0 && (
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">VAT / Tax</span>
            <span className="fw-semibold">{formatNaira(tax)}</span>
          </div>
        )}
        <hr />
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="fw-bold fs-5">Total</span>
          <span className="fw-bold fs-5 text-success" data-testid="summary-total">
            {formatNaira(total)}
          </span>
        </div>
        {footerAction}
      </div>
    </div>
  );
};
