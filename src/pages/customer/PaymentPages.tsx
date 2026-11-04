import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../../api/endpoints';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatLagosDateTime, formatNaira } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';

function resolveReference(searchParams: URLSearchParams): string {
  return searchParams.get('reference') || searchParams.get('trxref') || '';
}

// 1. /payment/verify — calls GET /payments/{reference}/verify and routes based strictly on backend status
export const PaymentVerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = resolveReference(searchParams);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-verify', reference],
    queryFn: () => paymentApi.verify(reference),
    enabled: Boolean(reference),
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    const encodedRef = encodeURIComponent(data.reference);
    if (data.status === 'Successful') {
      navigate(`/payment/success?reference=${encodedRef}`, { replace: true });
    } else if (data.status === 'Pending' || data.status === 'Initialized') {
      navigate(`/payment/pending?reference=${encodedRef}`, { replace: true });
    } else {
      navigate(`/payment/failure?reference=${encodedRef}`, { replace: true });
    }
  }, [data, navigate]);

  if (!reference) {
    return (
      <div className="container py-5">
        <ErrorState
          title="Missing Payment Reference"
          message="No payment reference was provided in the callback URL."
        />
      </div>
    );
  }

  return (
    <div className="container py-5">
      {isLoading ? (
        <LoadingSpinner fullPage label="Verifying your payment with Paystack..." />
      ) : error ? (
        <ErrorState
          title="Verification Error"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : null}
    </div>
  );
};

// 2. /payment/pending — Polls verify every 5s up to ~2 min (24 polls)
export const PaymentPendingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = resolveReference(searchParams);
  const [pollCount, setPollCount] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-verify-poll', reference],
    queryFn: () => paymentApi.verify(reference),
    enabled: Boolean(reference),
    refetchInterval: pollCount < 24 ? 5000 : false,
  });

  useEffect(() => {
    if (!data) return;
    setPollCount((c) => c + 1);
    const encodedRef = encodeURIComponent(data.reference);
    if (data.status === 'Successful') {
      navigate(`/payment/success?reference=${encodedRef}`, { replace: true });
    } else if (
      data.status === 'Failed' ||
      data.status === 'Abandoned' ||
      data.status === 'Reversed'
    ) {
      navigate(`/payment/failure?reference=${encodedRef}`, { replace: true });
    }
  }, [data, navigate]);

  return (
    <div className="container py-5">
      <div className="card shadow-sm border-warning mx-auto" style={{ maxWidth: 560 }}>
        <div className="card-body text-center p-4" data-testid="payment-pending-view">
          <div className="spinner-border text-warning mb-3" role="status" aria-hidden="true" />
          <h1 className="h4 fw-bold">Payment Verification Pending</h1>
          <p className="text-muted">
            We are awaiting final confirmation from the payment gateway for reference{' '}
            <code>{reference}</code>.
          </p>
          {data && (
            <div className="mb-3">
              <div>
                Order: <strong>{data.orderNumber}</strong> · Amount:{' '}
                <strong>{formatNaira(data.amount)}</strong>
              </div>
              <div className="mt-1">
                Backend Status: <StatusBadge status={data.status} />
              </div>
              <div className="small text-muted mt-1">{data.message}</div>
            </div>
          )}
          {isLoading && <LoadingSpinner label="Checking payment status..." />}
          {error && <ErrorState error={error} />}
          <div className="d-flex justify-content-center gap-3 mt-3">
            <button
              type="button"
              className="btn btn-warning fw-semibold"
              onClick={() => void refetch()}
            >
              Check Status Now
            </button>
            {data?.orderId && (
              <Link to={`/orders/${data.orderId}`} className="btn btn-outline-secondary">
                View Order
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. /payment/success — Shows ONLY backend-confirmed status (never trusts URL parameters alone!)
export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reference = resolveReference(searchParams);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-verify-success', reference],
    queryFn: () => paymentApi.verify(reference),
    enabled: Boolean(reference),
    retry: false,
  });

  if (!reference) {
    return (
      <div className="container py-5">
        <ErrorState title="Invalid Payment Reference" message="No payment reference found." />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner fullPage label="Confirming payment status with server..." />;
  }

  if (error || !data) {
    return (
      <div className="container py-5">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  // Security & Contract Requirement: NEVER mark an order paid from URL alone if backend says Failed/Pending
  if (data.status !== 'Successful') {
    return (
      <div className="container py-5">
        <div
          className="card shadow-sm border-danger mx-auto"
          style={{ maxWidth: 560 }}
          data-testid="payment-unconfirmed-view"
        >
          <div className="card-body text-center p-4">
            <i
              className="bi bi-x-circle-fill display-4 text-danger d-block mb-3"
              aria-hidden="true"
            />
            <h1 className="h4 fw-bold">Payment Not Confirmed</h1>
            <p className="text-muted">
              The server reported payment status <strong>{data.status}</strong> for order{' '}
              <strong>{data.orderNumber}</strong>.
            </p>
            <p className="small text-danger">{data.message}</p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <Link
                to={`/payment/failure?reference=${encodeURIComponent(data.reference)}`}
                className="btn btn-danger"
              >
                Go to Payment Recovery
              </Link>
              <Link to={`/orders/${data.orderId}`} className="btn btn-outline-secondary">
                View Order Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div
        className="card shadow-sm border-success mx-auto"
        style={{ maxWidth: 560 }}
        data-testid="payment-confirmed-success-view"
      >
        <div className="card-body text-center p-4">
          <i
            className="bi bi-check-circle-fill display-3 text-success d-block mb-3"
            aria-hidden="true"
          />
          <h1 className="h3 fw-bold text-success">Payment Successful!</h1>
          <p className="text-muted">{data.message}</p>

          <div className="bg-light rounded p-3 text-start my-3 border small">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Order Number:</span>
              <strong>{data.orderNumber}</strong>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Payment Reference:</span>
              <code>{data.reference}</code>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Amount Paid:</span>
              <strong className="text-success">{formatNaira(data.amount)}</strong>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Order Status:</span>
              <StatusBadge status={data.orderStatus} />
            </div>
            {data.paidAt && (
              <div className="d-flex justify-content-between">
                <span className="text-muted">Paid At:</span>
                <span>{formatLagosDateTime(data.paidAt)}</span>
              </div>
            )}
          </div>

          <div className="d-flex justify-content-center gap-3 mt-4">
            <Link to={`/orders/${data.orderId}`} className="btn btn-success">
              View Order & Track Delivery
            </Link>
            <Link to="/products" className="btn btn-outline-secondary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. /payment/failure
export const PaymentFailurePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const reference = resolveReference(searchParams);
  const [retrying, setRetrying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payment-verify-failure', reference],
    queryFn: () => paymentApi.verify(reference),
    enabled: Boolean(reference),
    retry: false,
  });

  const handleRetryPayment = async () => {
    if (!data?.orderId) return;
    setRetrying(true);
    try {
      const res = await paymentApi.initialize(data.orderId);
      if (res.authorizationUrl) {
        window.location.assign(res.authorizationUrl);
      } else {
        showToast(res.message || 'Payment initialization is pending.', 'warning');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not re-initialize payment', 'danger');
    } finally {
      setRetrying(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullPage label="Loading payment details..." />;

  return (
    <div className="container py-5">
      <div
        className="card shadow-sm border-danger mx-auto"
        style={{ maxWidth: 560 }}
        data-testid="payment-failure-view"
      >
        <div className="card-body text-center p-4">
          <i
            className="bi bi-x-octagon-fill display-3 text-danger d-block mb-3"
            aria-hidden="true"
          />
          <h1 className="h3 fw-bold text-danger">Payment Unsuccessful</h1>
          <p className="text-muted">
            {data?.message || 'Your payment was declined, abandoned, or could not be completed.'}
          </p>

          {data && (
            <div className="bg-light rounded p-3 text-start my-3 border small">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Order Number:</span>
                <strong>{data.orderNumber}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Reference:</span>
                <code>{data.reference}</code>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Payment Status:</span>
                <StatusBadge status={data.status} />
              </div>
            </div>
          )}

          <div className="d-flex justify-content-center gap-3 mt-4">
            {data?.orderId && data.orderStatus === 'PendingPayment' && (
              <button
                type="button"
                className="btn btn-success"
                disabled={retrying}
                onClick={handleRetryPayment}
              >
                {retrying ? 'Redirecting...' : 'Retry Payment'}
              </button>
            )}
            {data?.orderId && (
              <Link to={`/orders/${data.orderId}`} className="btn btn-outline-secondary">
                View Order Details
              </Link>
            )}
            <Link to="/cart" className="btn btn-outline-dark">
              Return to Cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
