import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { OrderTimeline } from '../../components/common/OrderTimeline';
import { formatLagosDateTime, formatNaira } from '../../utils/format';
import type { OrderStatus } from '../../types/api';

const ORDER_STATUSES: OrderStatus[] = [
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

export const AdminOrdersListPage: React.FC = () => {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', { status, search, from, to, page }],
    queryFn: () =>
      adminApi.listOrders({
        status: status || undefined,
        search: search || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: 15,
      }),
  });

  return (
    <div>
      <h1 className="h3 fw-bold mb-4">Orders Fulfilment & Management</h1>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label small fw-bold">Search</label>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Order #, customer, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-bold">Order Status</label>
            <select
              className="form-select form-select-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderStatus | '');
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-bold">From Date</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-bold">To Date</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading orders..." />
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="text-end">Total</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((o) => (
                  <tr key={o.id}>
                    <td className="fw-bold">{o.orderNumber}</td>
                    <td>
                      <div className="fw-semibold">{o.customerName}</div>
                      <div className="small text-muted">{o.customerEmail}</div>
                    </td>
                    <td className="small text-muted">{formatLagosDateTime(o.createdAt)}</td>
                    <td>{o.deliveryMethod}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      <StatusBadge status={o.paymentStatus} />
                    </td>
                    <td className="text-end fw-bold text-success">{formatNaira(o.total)}</td>
                    <td className="text-end">
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="btn btn-sm btn-outline-dark"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && (
        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
};

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [actionNote, setActionNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Create Refund Modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => adminApi.getOrder(id!),
    enabled: Boolean(id),
  });

  if (isLoading || !order) return <LoadingSpinner fullPage label="Loading order details..." />;

  const handleStatusTransition = async (
    targetStatus: 'Processing' | 'ReadyForDispatch' | 'Delivered',
  ) => {
    setSubmittingAction(true);
    try {
      const updated = await adminApi.updateOrderStatus(
        order.id,
        targetStatus,
        actionNote || undefined,
      );
      queryClient.setQueryData(['admin-order', order.id], updated);
      setActionNote('');
      showToast(`Order moved to ${targetStatus}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Status transition failed', 'danger');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancellationDecision = async (approve: boolean) => {
    setSubmittingAction(true);
    try {
      const updated = approve
        ? await adminApi.approveCancellation(order.id, actionNote || undefined)
        : await adminApi.rejectCancellation(order.id, actionNote || undefined);
      queryClient.setQueryData(['admin-order', order.id], updated);
      setActionNote('');
      showToast(approve ? 'Cancellation approved' : 'Cancellation rejected', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Operation failed', 'danger');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      await adminApi.createRefund({
        orderId: order.id,
        amount: refundAmount,
        reason: refundReason.trim() || 'Admin initiated refund',
      });
      showToast('Refund initiated!', 'success');
      setShowRefundModal(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-order', order.id] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refund failed', 'danger');
    } finally {
      setSubmittingAction(false);
    }
  };

  const allowed = order.allowedActions || [];

  return (
    <div>
      <div className="mb-3">
        <Link to="/admin/orders" className="text-decoration-none small text-muted">
          ← Back to Orders List
        </Link>
        <div className="d-flex flex-wrap justify-content-between align-items-center mt-1">
          <h1 className="h3 fw-bold mb-0">
            Order {order.orderNumber} <StatusBadge status={order.status} className="ms-2 fs-6" />
          </h1>
          <div className="small text-muted">
            Customer: <strong>{order.customerName}</strong> ({order.customerEmail} ·{' '}
            {order.customerPhone || 'No phone'})
          </div>
        </div>
      </div>

      {/* Allowed Actions Bar */}
      <div className="card shadow-sm border-0 mb-4 bg-light">
        <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="flex-grow-1" style={{ maxWidth: 420 }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Optional action note..."
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
            />
          </div>
          <div className="d-flex flex-wrap gap-2">
            {allowed.includes('Processing') && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={submittingAction}
                onClick={() => void handleStatusTransition('Processing')}
              >
                Mark Processing
              </button>
            )}
            {allowed.includes('ReadyForDispatch') && (
              <button
                type="button"
                className="btn btn-sm btn-info"
                disabled={submittingAction}
                onClick={() => void handleStatusTransition('ReadyForDispatch')}
              >
                Mark Ready for Dispatch
              </button>
            )}
            {allowed.includes('Delivered') && (
              <button
                type="button"
                className="btn btn-sm btn-success"
                disabled={submittingAction}
                onClick={() => void handleStatusTransition('Delivered')}
              >
                Mark Pickup Collected
              </button>
            )}
            {isAdmin &&
              (allowed.includes('CancelApprove') ||
                order.status === 'CancellationRequested') && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-warning"
                    disabled={submittingAction}
                    onClick={() => void handleCancellationDecision(true)}
                  >
                    Approve Cancellation
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={submittingAction}
                    onClick={() => void handleCancellationDecision(false)}
                  >
                    Reject Cancellation
                  </button>
                </>
              )}
            {isAdmin && order.refundableAmount > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  setRefundAmount(order.refundableAmount);
                  setRefundReason('');
                  setShowRefundModal(true);
                }}
              >
                Issue Refund (up to {formatNaira(order.refundableAmount)})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white fw-bold">Line Items</div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Drink / Variant</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Line Total</th>
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
                      <td className="text-end fw-bold">{formatNaira(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-bold">Audit & Status Timeline</div>
            <div className="card-body">
              <OrderTimeline history={order.statusHistory} />
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-white fw-bold">Financial Summary</div>
            <div className="card-body small">
              <div className="d-flex justify-content-between mb-1">
                <span>Subtotal:</span>
                <span>{formatNaira(order.subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span>Discount:</span>
                <span>-{formatNaira(order.discount)}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span>Delivery Fee:</span>
                <span>{formatNaira(order.deliveryFee)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-6 mb-2">
                <span>Total:</span>
                <span className="text-success">{formatNaira(order.total)}</span>
              </div>
              <div className="d-flex justify-content-between text-muted">
                <span>Refunded:</span>
                <span>{formatNaira(order.refundedAmount)}</span>
              </div>
              <div className="d-flex justify-content-between text-muted">
                <span>Refundable:</span>
                <span>{formatNaira(order.refundableAmount)}</span>
              </div>
            </div>
          </div>

          {order.address && (
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white fw-bold">Delivery Destination</div>
              <div className="card-body small">
                <div className="fw-bold">{order.address.recipientName}</div>
                <div>{order.address.phoneNumber}</div>
                <div>{order.address.street}</div>
                <div>
                  {order.address.city}, {order.address.state}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleCreateRefund}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Issue Refund — {order.orderNumber}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowRefundModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">
                      Refund Amount (Max: {formatNaira(order.refundableAmount)})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={1}
                      max={order.refundableAmount}
                      className="form-control"
                      required
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Reason</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      required
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowRefundModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={
                      submittingAction ||
                      refundAmount <= 0 ||
                      refundAmount > order.refundableAmount
                    }
                  >
                    Submit Refund
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
