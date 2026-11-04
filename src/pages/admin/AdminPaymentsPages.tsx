import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../contexts/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatLagosDateTime, formatNaira } from '../../utils/format';
import type {
  AdminPaymentDetailDto,
  PaymentStatus,
  ReconciliationRecordDto,
  ReconciliationStatus,
  RefundStatus,
} from '../../types/api';

// 1. Admin Payments Page (/admin/payments)
export const AdminPaymentsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentDetailDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', { status, search, page }],
    queryFn: () =>
      adminApi.listPayments({
        status: status || undefined,
        search: search || undefined,
        page,
        pageSize: 15,
      }),
  });

  const handleOpenDetail = async (id: string) => {
    try {
      const detail = await adminApi.getPayment(id);
      setSelectedPayment(detail);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load payment', 'danger');
    }
  };

  const handleReverify = async (reference: string) => {
    try {
      const res = await adminApi.reverifyPayment(reference);
      showToast(`Reverified ${reference}: ${res.status}`, 'info');
      await queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      if (selectedPayment) {
        const refreshed = await adminApi.getPayment(selectedPayment.id);
        setSelectedPayment(refreshed);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reverify failed', 'danger');
    }
  };

  return (
    <div>
      <h1 className="h3 fw-bold mb-4">Payments Ledger</h1>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body row g-2">
          <div className="col-md-6">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search reference, order #, or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-md-6">
            <select
              className="form-select form-select-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as PaymentStatus | '');
                setPage(1);
              }}
            >
              <option value="">All Payment Statuses</option>
              <option value="Initialized">Initialized</option>
              <option value="Pending">Pending</option>
              <option value="Successful">Successful</option>
              <option value="Failed">Failed</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Reversed">Reversed</option>
              <option value="RefundPending">RefundPending</option>
              <option value="PartiallyRefunded">PartiallyRefunded</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading payments..." />
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Reference</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Channel</th>
                  <th className="text-end">Amount</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code>{p.reference}</code>
                    </td>
                    <td>
                      <Link to={`/admin/orders/${p.orderId}`} className="fw-semibold">
                        {p.orderNumber}
                      </Link>
                    </td>
                    <td className="small">{p.customerEmail}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="small">{p.channel || '—'}</td>
                    <td className="text-end fw-bold">{formatNaira(p.amount)}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-dark me-1"
                        onClick={() => void handleOpenDetail(p.id)}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        onClick={() => void handleReverify(p.reference)}
                      >
                        Reverify
                      </button>
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

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  Payment <code>{selectedPayment.reference}</code>
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedPayment(null)}
                />
              </div>
              <div className="modal-body small">
                <div className="row g-2 mb-3">
                  <div className="col-md-4">
                    <strong>Status:</strong> <StatusBadge status={selectedPayment.status} />
                  </div>
                  <div className="col-md-4">
                    <strong>Amount:</strong> {formatNaira(selectedPayment.amount)}
                  </div>
                  <div className="col-md-4">
                    <strong>Gateway Response:</strong> {selectedPayment.gatewayResponse || '—'}
                  </div>
                </div>

                <h6 className="fw-bold">Initialization Attempts</h6>
                <ul className="list-group mb-3">
                  {selectedPayment.attempts.map((a) => (
                    <li key={a.id} className="list-group-item d-flex justify-content-between">
                      <span>
                        <code>{a.reference}</code> — {a.status}{' '}
                        {a.errorMessage ? `(${a.errorMessage})` : ''}
                      </span>
                      <span className="text-muted">{formatLagosDateTime(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>

                {selectedPayment.refunds.length > 0 && (
                  <>
                    <h6 className="fw-bold">Refunds</h6>
                    <ul className="list-group mb-3">
                      {selectedPayment.refunds.map((r) => (
                        <li key={r.id} className="list-group-item d-flex justify-content-between">
                          <span>
                            {formatNaira(r.amount)} — {r.reason}
                          </span>
                          <StatusBadge status={r.status} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 2. Admin Refunds Page (/admin/refunds)
export const AdminRefundsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<RefundStatus | ''>('');
  const [page, setPage] = useState(1);

  // Create refund modal
  const [showCreate, setShowCreate] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState<number>(1000);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-refunds', { status, page }],
    queryFn: () =>
      adminApi.listRefunds({
        status: status || undefined,
        page,
        pageSize: 15,
      }),
  });

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createRefund({ orderId: orderId.trim(), amount, reason: reason.trim() });
      showToast('Refund created!', 'success');
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refund creation failed', 'danger');
    }
  };

  const handleSync = async (id: string) => {
    try {
      const res = await adminApi.syncRefund(id);
      showToast(`Refund synced: ${res.status}`, 'info');
      await queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sync failed', 'danger');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0">Refunds Management</h1>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RefundStatus | '');
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Requested">Requested</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Processed">Processed</option>
            <option value="Failed">Failed</option>
            <option value="NeedsAttention">NeedsAttention</option>
          </select>
          <button
            type="button"
            className="btn btn-sm btn-danger text-nowrap"
            onClick={() => setShowCreate(true)}
          >
            + Create Refund
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading refunds..." />
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order #</th>
                  <th>Payment Ref</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="text-end">Amount</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/admin/orders/${r.orderId}`} className="fw-bold">
                        {r.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <code>{r.paymentReference}</code>
                    </td>
                    <td className="small">{r.reason}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="text-end fw-bold">{formatNaira(r.amount)}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-dark"
                        onClick={() => void handleSync(r.id)}
                      >
                        Sync Provider
                      </button>
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

      {showCreate && (
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
                  <h5 className="modal-title fw-bold">Create Order Refund</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowCreate(false)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Order ID (GUID)</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Amount (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={1}
                      className="form-control"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Reason</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-danger">
                    Create Refund
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

// 3. Admin Reconciliation Page (/admin/reconciliation)
export const AdminReconciliationPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<ReconciliationStatus | ''>('Open');
  const [page, setPage] = useState(1);
  const [running, setRunning] = useState(false);
  const [resolvingItem, setResolvingItem] = useState<ReconciliationRecordDto | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reconciliation', { status, page }],
    queryFn: () =>
      adminApi.listReconciliation({
        status: status || undefined,
        page,
        pageSize: 15,
      }),
  });

  const handleRunReconciliation = async () => {
    setRunning(true);
    try {
      const res = await adminApi.runReconciliation();
      showToast(
        `Checked ${res.paymentsChecked} payments; ${res.exceptionsCreated} new exceptions.`,
        'info',
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-reconciliation'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Run failed', 'danger');
    } finally {
      setRunning(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingItem) return;
    try {
      await adminApi.resolveReconciliation(resolvingItem.id, resolutionNote.trim());
      showToast('Reconciliation exception resolved!', 'success');
      setResolvingItem(null);
      setResolutionNote('');
      await queryClient.invalidateQueries({ queryKey: ['admin-reconciliation'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Resolve failed', 'danger');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0">Payment Reconciliation</h1>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ReconciliationStatus | '');
              setPage(1);
            }}
          >
            <option value="">All Records</option>
            <option value="Open">Open</option>
            <option value="Resolved">Resolved</option>
          </select>
          <button
            type="button"
            className="btn btn-sm btn-success text-nowrap"
            disabled={running}
            onClick={() => void handleRunReconciliation()}
          >
            {running ? 'Running...' : 'Run Reconciliation Now'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading reconciliation records..." />
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Type</th>
                  <th>Order / Payment</th>
                  <th>Description</th>
                  <th>Expected / Actual</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <span className="badge text-bg-light border text-dark">{rec.type}</span>
                    </td>
                    <td className="small">
                      <div>{rec.orderNumber || '—'}</div>
                      <code>{rec.paymentReference || '—'}</code>
                    </td>
                    <td className="small">
                      <div>{rec.description}</div>
                      {rec.resolutionNote && (
                        <div className="text-success">Resolution: {rec.resolutionNote}</div>
                      )}
                    </td>
                    <td className="small">
                      {formatNaira(rec.expectedAmount)} / {formatNaira(rec.actualAmount)}
                    </td>
                    <td>
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="text-end">
                      {rec.status === 'Open' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => {
                            setResolvingItem(rec);
                            setResolutionNote('');
                          }}
                        >
                          Resolve
                        </button>
                      )}
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

      {resolvingItem && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleResolveSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Resolve Discrepancy</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setResolvingItem(null)}
                  />
                </div>
                <div className="modal-body">
                  <p className="small text-muted">{resolvingItem.description}</p>
                  <label className="form-label small fw-bold">Resolution Note</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    required
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-success">
                    Mark Resolved
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
