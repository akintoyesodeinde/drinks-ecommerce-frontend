import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type {
  DeliveryDto,
  DeliveryExceptionReason,
  DeliveryStatus,
} from '../../types/api';

const DELIVERY_STATUSES: DeliveryStatus[] = [
  'NotScheduled',
  'AwaitingDispatch',
  'Assigned',
  'OutForDelivery',
  'Delivered',
  'FailedAttempt',
  'Returned',
  'Cancelled',
];

const EXCEPTION_REASONS: DeliveryExceptionReason[] = [
  'CustomerUnavailable',
  'AddressIssue',
  'Damaged',
  'Refused',
  'Other',
];

export const AdminDeliveriesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const [page, setPage] = useState(1);

  // Assign Rider Modal
  const [assigningDelivery, setAssigningDelivery] = useState<DeliveryDto | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');

  // Deliver Modal
  const [deliveringOrder, setDeliveringOrder] = useState<DeliveryDto | null>(null);
  const [receivedBy, setReceivedBy] = useState('');
  const [deliverNote, setDeliverNote] = useState('');

  // Exception Modal
  const [exceptionOrder, setExceptionOrder] = useState<DeliveryDto | null>(null);
  const [exceptionReason, setExceptionReason] =
    useState<DeliveryExceptionReason>('CustomerUnavailable');
  const [exceptionNote, setExceptionNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-deliveries', { status, page }],
    queryFn: () =>
      adminApi.listDeliveries({
        status: status || undefined,
        page,
        pageSize: 15,
      }),
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['admin-delivery-staff'],
    queryFn: () => adminApi.listDeliveryStaff(),
    enabled: isAdmin,
  });

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    const found = staffList.find((s) => s.id === staffId);
    if (found) {
      setRiderName(found.name);
      setRiderPhone(found.phoneNumber);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningDelivery) return;
    try {
      await adminApi.assignDelivery(assigningDelivery.orderId, {
        assignedToUserId: selectedStaffId || undefined,
        riderName,
        riderPhone,
      });
      showToast('Rider assigned!', 'success');
      setAssigningDelivery(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Assign failed', 'danger');
    }
  };

  const handleDispatch = async (orderId: string) => {
    try {
      await adminApi.dispatchDelivery(orderId, 'Dispatched from warehouse');
      showToast('Order dispatched for delivery!', 'success');
      await queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Dispatch failed', 'danger');
    }
  };

  const handleDeliverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveringOrder) return;
    try {
      await adminApi.markDelivered(
        deliveringOrder.orderId,
        receivedBy || undefined,
        deliverNote || undefined,
      );
      showToast('Delivery marked as completed!', 'success');
      setDeliveringOrder(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to mark delivered', 'danger');
    }
  };

  const handleExceptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionOrder) return;
    try {
      await adminApi.recordDeliveryException(
        exceptionOrder.orderId,
        exceptionReason,
        exceptionNote || undefined,
      );
      showToast('Delivery exception recorded', 'warning');
      setExceptionOrder(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to record exception', 'danger');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0">Dispatch & Deliveries</h1>
        <select
          className="form-select form-select-sm"
          style={{ width: 220 }}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as DeliveryStatus | '');
            setPage(1);
          }}
        >
          <option value="">All Delivery Statuses</option>
          {DELIVERY_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading deliveries..." />
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order #</th>
                  <th>Recipient & Address</th>
                  <th>Rider</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((del) => (
                  <tr key={del.id}>
                    <td className="fw-bold">{del.orderNumber}</td>
                    <td>
                      <div className="fw-semibold">
                        {del.recipientName} ({del.phoneNumber})
                      </div>
                      <div className="small text-muted">
                        {del.addressLine}, {del.city}, {del.state}
                      </div>
                    </td>
                    <td>
                      {del.riderName ? (
                        <div>
                          <div className="fw-medium">{del.riderName}</div>
                          <div className="small text-muted">{del.riderPhone}</div>
                        </div>
                      ) : (
                        <span className="text-muted small">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={del.status} />
                    </td>
                    <td>{del.attemptCount}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => {
                              setAssigningDelivery(del);
                              setSelectedStaffId(del.assignedToUserId || '');
                              setRiderName(del.riderName || '');
                              setRiderPhone(del.riderPhone || '');
                            }}
                          >
                            Assign Rider
                          </button>
                        )}
                        {(del.status === 'Assigned' ||
                          del.status === 'AwaitingDispatch' ||
                          del.status === 'FailedAttempt') && (
                          <button
                            type="button"
                            className="btn btn-outline-info"
                            onClick={() => void handleDispatch(del.orderId)}
                          >
                            Dispatch
                          </button>
                        )}
                        {del.status === 'OutForDelivery' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={() => {
                                setDeliveringOrder(del);
                                setReceivedBy(del.recipientName);
                                setDeliverNote('');
                              }}
                            >
                              Deliver
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => {
                                setExceptionOrder(del);
                                setExceptionNote('');
                              }}
                            >
                              Exception
                            </button>
                          </>
                        )}
                      </div>
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

      {/* Assign Rider Modal */}
      {assigningDelivery && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleAssignSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    Assign Rider — {assigningDelivery.orderNumber}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setAssigningDelivery(null)}
                  />
                </div>
                <div className="modal-body">
                  {staffList.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Select Delivery Staff</label>
                      <select
                        className="form-select"
                        value={selectedStaffId}
                        onChange={(e) => handleStaffSelect(e.target.value)}
                      >
                        <option value="">-- Custom / External Rider --</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.phoneNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Rider Name</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={riderName}
                      onChange={(e) => setRiderName(e.target.value)}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Rider Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={riderPhone}
                      onChange={(e) => setRiderPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setAssigningDelivery(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success">
                    Assign Rider
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mark Delivered Modal */}
      {deliveringOrder && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleDeliverSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    Confirm Delivery — {deliveringOrder.orderNumber}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setDeliveringOrder(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Received By</label>
                    <input
                      type="text"
                      className="form-control"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Delivery Note</label>
                    <input
                      type="text"
                      className="form-control"
                      value={deliverNote}
                      onChange={(e) => setDeliverNote(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-success">
                    Confirm Delivered
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Exception Modal */}
      {exceptionOrder && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleExceptionSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    Delivery Exception — {exceptionOrder.orderNumber}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setExceptionOrder(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Reason</label>
                    <select
                      className="form-select"
                      value={exceptionReason}
                      onChange={(e) =>
                        setExceptionReason(e.target.value as DeliveryExceptionReason)
                      }
                    >
                      {EXCEPTION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Details / Note</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={exceptionNote}
                      onChange={(e) => setExceptionNote(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-danger">
                    Record Exception
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
