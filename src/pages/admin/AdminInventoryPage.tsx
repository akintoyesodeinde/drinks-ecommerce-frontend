import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { formatLagosDateTime } from '../../utils/format';
import type { InventoryItemDto } from '../../types/api';

export const AdminInventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [lowStockOnly, setLowStockOnly] = useState(
    searchParams.get('lowStockOnly') === 'true',
  );
  const [page, setPage] = useState(1);

  // Adjust Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItemDto | null>(null);
  const [adjustType, setAdjustType] = useState<'Restock' | 'Adjustment' | 'Damage' | 'Correction'>(
    'Restock',
  );
  const [quantityChange, setQuantityChange] = useState<number>(10);
  const [reason, setReason] = useState('');

  // Threshold Modal
  const [thresholdItem, setThresholdItem] = useState<InventoryItemDto | null>(null);
  const [newThreshold, setNewThreshold] = useState<number>(10);

  // Transactions History Modal
  const [historyItem, setHistoryItem] = useState<InventoryItemDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-inventory', { search, lowStockOnly, page }],
    queryFn: () =>
      adminApi.listInventory({
        search: search || undefined,
        lowStockOnly: lowStockOnly ? true : undefined,
        page,
        pageSize: 15,
      }),
  });

  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['admin-inventory-tx', historyItem?.variantId],
    queryFn: () => adminApi.listInventoryTransactions(historyItem!.variantId, { pageSize: 25 }),
    enabled: Boolean(historyItem),
  });

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    try {
      await adminApi.adjustInventory(adjustingItem.variantId, {
        quantityChange,
        type: adjustType,
        reason: reason.trim() || `${adjustType} update`,
      });
      showToast('Inventory adjusted!', 'success');
      setAdjustingItem(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Adjustment failed', 'danger');
    }
  };

  const handleThresholdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholdItem) return;
    try {
      await adminApi.updateThreshold(thresholdItem.variantId, newThreshold);
      showToast('Low-stock threshold updated!', 'success');
      setThresholdItem(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Threshold update failed', 'danger');
    }
  };

  return (
    <div>
      <h1 className="h3 fw-bold mb-4">Warehouse Inventory</h1>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body row g-3 align-items-center">
          <div className="col-md-6">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search SKU, product, or variant..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-md-6">
            <div className="form-check form-switch mb-0">
              <input
                id="inv-low-stock"
                type="checkbox"
                className="form-check-input"
                checked={lowStockOnly}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setLowStockOnly(checked);
                  setPage(1);
                  setSearchParams(checked ? { lowStockOnly: 'true' } : {});
                }}
              />
              <label htmlFor="inv-low-stock" className="form-check-label small fw-semibold">
                Show Low-Stock Variants Only
              </label>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading inventory levels..." />
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>SKU</th>
                  <th>Product / Pack</th>
                  <th className="text-center">On Hand</th>
                  <th className="text-center">Reserved</th>
                  <th className="text-center">Available</th>
                  <th className="text-center">Threshold</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((item) => (
                  <tr key={item.variantId}>
                    <td>
                      <code>{item.sku}</code>
                    </td>
                    <td>
                      <div className="fw-semibold">{item.productName}</div>
                      <div className="small text-muted">{item.variantName}</div>
                    </td>
                    <td className="text-center fw-bold">{item.onHand}</td>
                    <td className="text-center text-secondary">{item.reserved}</td>
                    <td className="text-center fw-bold text-success">{item.available}</td>
                    <td className="text-center">{item.lowStockThreshold}</td>
                    <td>
                      {item.available <= 0 ? (
                        <span className="badge text-bg-danger">Out of Stock</span>
                      ) : item.isLowStock ? (
                        <span className="badge text-bg-warning">Low Stock</span>
                      ) : (
                        <span className="badge text-bg-success">Healthy</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-success"
                          onClick={() => {
                            setAdjustingItem(item);
                            setQuantityChange(10);
                            setAdjustType('Restock');
                            setReason('');
                          }}
                        >
                          Adjust
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setThresholdItem(item);
                            setNewThreshold(item.lowStockThreshold);
                          }}
                        >
                          Threshold
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-dark"
                          onClick={() => setHistoryItem(item)}
                        >
                          History
                        </button>
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

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleAdjustSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    Adjust Stock — {adjustingItem.productName} ({adjustingItem.variantName})
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setAdjustingItem(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="small text-muted mb-3">
                    Current On Hand: <strong>{adjustingItem.onHand}</strong> · Reserved:{' '}
                    <strong>{adjustingItem.reserved}</strong> · Available:{' '}
                    <strong>{adjustingItem.available}</strong>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Adjustment Type</label>
                    <select
                      className="form-select"
                      value={adjustType}
                      onChange={(e) =>
                        setAdjustType(
                          e.target.value as 'Restock' | 'Adjustment' | 'Damage' | 'Correction',
                        )
                      }
                    >
                      <option value="Restock">Restock (+)</option>
                      <option value="Adjustment">Adjustment (+/-)</option>
                      <option value="Damage">Damage (-)</option>
                      <option value="Correction">Correction (+/-)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">
                      Quantity Change (use negative number to deduct)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={quantityChange}
                      onChange={(e) => setQuantityChange(Number(e.target.value))}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Reason</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. Supplier delivery batch #42"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setAdjustingItem(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success">
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Modal */}
      {thresholdItem && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleThresholdSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Low Stock Threshold</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setThresholdItem(null)}
                  />
                </div>
                <div className="modal-body">
                  <label className="form-label small fw-bold">Threshold Quantity</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    required
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(Number(e.target.value))}
                  />
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-success btn-sm">
                    Save Threshold
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {historyItem && (
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
                  Stock Ledger — {historyItem.sku} ({historyItem.productName})
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setHistoryItem(null)}
                />
              </div>
              <div className="modal-body">
                {loadingTx ? (
                  <LoadingSpinner label="Loading ledger..." />
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th className="text-center">Change</th>
                          <th className="text-center">On Hand After</th>
                          <th>Reason / Actor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(txData?.items ?? []).map((tx) => (
                          <tr key={tx.id}>
                            <td className="small text-muted">
                              {formatLagosDateTime(tx.createdAt)}
                            </td>
                            <td>
                              <span className="badge text-bg-light border text-dark">
                                {tx.type}
                              </span>
                            </td>
                            <td
                              className={`text-center fw-bold ${
                                tx.quantityChange >= 0 ? 'text-success' : 'text-danger'
                              }`}
                            >
                              {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                            </td>
                            <td className="text-center">{tx.onHandAfter}</td>
                            <td className="small">
                              {tx.reason || '—'}
                              {tx.actor ? ` (${tx.actor})` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
