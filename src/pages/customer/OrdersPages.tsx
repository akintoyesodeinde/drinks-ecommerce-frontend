import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi, paymentApi } from '../../api/endpoints';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { OrderTimeline } from '../../components/common/OrderTimeline';
import { formatLagosDateTime, formatNaira } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';
import type { OrderStatus } from '../../types/api';

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'PendingPayment',
  'Confirmed',
  'Processing',
  'ReadyForDispatch',
  'OutForDelivery',
  'Delivered',
  'DeliveryFailed',
  'CancellationRequested',
  'Cancelled',
  'RefundPending',
  'PartiallyRefunded',
  'Refunded',
];

// 1. Order History (/orders)
export const OrderHistoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as OrderStatus | '') || '';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', { status, page }],
    queryFn: () => ordersApi.list({ status, page, pageSize: 10 }),
  });

  const handleStatusChange = (nextStatus: string) => {
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set('status', nextStatus);
    else next.delete('status');
    next.delete('page');
    setSearchParams(next);
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h1 className="h3 fw-bold mb-0">My Orders</h1>
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="order-status-filter" className="small fw-semibold text-nowrap">
            Filter Status:
          </label>
          <select
            id="order-status-filter"
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            {ORDER_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading your order history..." />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon="bi-bag-x"
          title="No orders found"
          description="You haven't placed any orders matching this filter yet."
          action={
            <Link to="/products" className="btn btn-success">
              Start Shopping
            </Link>
          }
        />
      ) : (
        <>
          <div className="card shadow-sm border-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Order #</th>
                    <th>Placed On</th>
                    <th>Items</th>
                    <th>Fulfilment</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((order) => (
                    <tr key={order.id} data-testid={`order-row-${order.orderNumber}`}>
                      <td className="fw-bold">{order.orderNumber}</td>
                      <td className="small text-muted">{formatLagosDateTime(order.createdAt)}</td>
                      <td>{order.itemCount}</td>
                      <td>{order.deliveryMethod}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <StatusBadge status={order.paymentStatus} />
                      </td>
                      <td className="text-end fw-bold text-success">
                        {formatNaira(order.total)}
                      </td>
                      <td className="text-end">
                        <Link
                          to={`/orders/${order.id}`}
                          className="btn btn-sm btn-outline-success"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(nextPage) => {
              const next = new URLSearchParams(searchParams);
              next.set('page', String(nextPage));
              setSearchParams(next);
            }}
          />
        </>
      )}
    </div>
  );
};

// 2. Order Details (/orders/:id)
export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: Boolean(id),
  });

  if (isLoading) return <LoadingSpinner fullPage label="Loading order details..." />;
  if (error || !order) {
    return (
      <div className="container py-4">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      const updated = await ordersApi.cancel(order.id, cancelReason || undefined);
      queryClient.setQueryData(['order', order.id], updated);
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowCancelModal(false);
      showToast('Order cancellation processed', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel order', 'danger');
    } finally {
      setCancelling(false);
    }
  };

  const handlePayNow = async () => {
    setPaying(true);
    try {
      const res = await paymentApi.initialize(order.id);
      if (res.authorizationUrl) {
        window.location.assign(res.authorizationUrl);
      } else {
        showToast(res.message || 'Payment initialization is pending.', 'warning');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not initialize payment', 'danger');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <Link to="/orders" className="text-decoration-none small text-muted d-block mb-1">
            ← Back to My Orders
          </Link>
          <h1 className="h3 fw-bold mb-0">
            Order {order.orderNumber} <StatusBadge status={order.status} className="ms-2 fs-6" />
          </h1>
          <div className="small text-muted mt-1">
            Placed on {formatLagosDateTime(order.createdAt)} · Fulfilment: {order.deliveryMethod}
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Link to={`/orders/${order.id}/tracking`} className="btn btn-outline-primary">
            <i className="bi bi-geo-alt me-1" aria-hidden="true" />
            Track Delivery
          </Link>
          {order.canPay && (
            <button
              type="button"
              className="btn btn-success fw-semibold"
              disabled={paying}
              onClick={handlePayNow}
            >
              <i className="bi bi-credit-card me-1" aria-hidden="true" />
              {paying ? 'Redirecting...' : 'Pay Now'}
            </button>
          )}
          {order.canCancel && (
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Items */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white fw-bold">Order Items</div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Drink / Variant</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">{item.productName}</div>
                        <div className="small text-muted">
                          {item.variantName} · <code>{item.sku}</code>
                        </div>
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-end">{formatNaira(item.unitPrice)}</td>
                      <td className="text-end fw-semibold">{formatNaira(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-bold">Order Status History</div>
            <div className="card-body">
              <OrderTimeline history={order.statusHistory} />
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Totals */}
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-white fw-bold">Payment & Totals</div>
            <div className="card-body small">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Subtotal</span>
                <span>{formatNaira(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>-{formatNaira(order.discount)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Delivery Fee</span>
                <span>{formatNaira(order.deliveryFee)}</span>
              </div>
              {order.tax > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Tax</span>
                  <span>{formatNaira(order.tax)}</span>
                </div>
              )}
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-6 mb-3">
                <span>Total</span>
                <span className="text-success">{formatNaira(order.total)}</span>
              </div>

              {order.payment && (
                <div className="bg-light p-2 rounded border">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Reference:</span>
                    <code>{order.payment.reference}</code>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Status:</span>
                    <StatusBadge status={order.payment.status} />
                  </div>
                  {order.payment.channel && (
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Channel:</span>
                      <span>{order.payment.channel}</span>
                    </div>
                  )}
                  {order.payment.paidAt && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Paid At:</span>
                      <span>{formatLagosDateTime(order.payment.paidAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Delivery / Pickup Address */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-bold">
              {order.deliveryMethod === 'Pickup' ? 'Pickup Location' : 'Delivery Address'}
            </div>
            <div className="card-body small">
              {order.address ? (
                <>
                  <div className="fw-bold">{order.address.recipientName}</div>
                  <div>{order.address.phoneNumber}</div>
                  <div>{order.address.street}</div>
                  <div>
                    {order.address.city}, {order.address.state}
                  </div>
                  {order.address.landmark && <div>Landmark: {order.address.landmark}</div>}
                </>
              ) : order.pickupLocation ? (
                <>
                  <div className="fw-bold">{order.pickupLocation.name}</div>
                  <div>{order.pickupLocation.address}</div>
                  <div>
                    {order.pickupLocation.city}, {order.pickupLocation.state}
                  </div>
                  <div>Hours: {order.pickupLocation.openingHours}</div>
                </>
              ) : null}
              {order.deliveryInstructions && (
                <div className="mt-2 text-muted">
                  Instructions: {order.deliveryInstructions}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelModal}
        title={`Cancel Order ${order.orderNumber}`}
        message="Please provide an optional reason for cancelling this order:"
        confirmLabel="Confirm Cancellation"
        isSubmitting={cancelling}
        onConfirm={() => void handleCancelOrder()}
        onCancel={() => setShowCancelModal(false)}
      >
        <textarea
          className="form-control mt-2"
          rows={2}
          placeholder="Reason for cancellation (optional)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
};

// 3. Delivery Tracking (/orders/:id/tracking)
export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const {
    data: tracking,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-tracking', id],
    queryFn: () => ordersApi.getTracking(id!),
    enabled: Boolean(id),
  });

  if (isLoading) return <LoadingSpinner fullPage label="Loading live delivery tracking..." />;
  if (error || !tracking) {
    return (
      <div className="container py-4">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <Link to={`/orders/${tracking.orderId}`} className="text-decoration-none small text-muted">
          ← Back to Order {tracking.orderNumber}
        </Link>
        <h1 className="h3 fw-bold mt-1">
          Delivery Tracking — {tracking.orderNumber}{' '}
          <StatusBadge status={tracking.orderStatus} className="ms-2 fs-6" />
        </h1>
      </div>

      {tracking.rider && (
        <div className="alert alert-info d-flex align-items-center justify-content-between">
          <div>
            <strong>Assigned Dispatch Rider:</strong> {tracking.rider.name} (
            {tracking.rider.phoneNumber})
          </div>
          {tracking.deliveryStatus && <StatusBadge status={tracking.deliveryStatus} />}
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <OrderTimeline steps={tracking.steps} history={tracking.history} />
        </div>
      </div>
    </div>
  );
};
