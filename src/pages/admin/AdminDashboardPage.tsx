import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatNaira } from '../../utils/format';

export const AdminDashboardPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const isAdmin = hasRole('Administrator');

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-analytics', { from, to }],
    queryFn: () => adminApi.getAnalyticsSummary({ from, to }),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <h1 className="h4 fw-bold mb-2">Welcome, {user?.firstName}</h1>
          <p className="text-muted mb-3">
            You are signed in with role(s): <strong>{user?.roles.join(', ')}</strong>. Use the
            navigation menu on the left to manage your assigned operations.
          </p>
          <div className="d-flex flex-wrap gap-2">
            {hasRole('WarehouseStaff') && (
              <>
                <Link to="/admin/inventory" className="btn btn-success">
                  Manage Inventory
                </Link>
                <Link to="/admin/orders" className="btn btn-outline-dark">
                  Fulfil Orders
                </Link>
              </>
            )}
            {hasRole('DeliveryStaff') && (
              <Link to="/admin/deliveries" className="btn btn-success">
                View Assigned Deliveries
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-0">Executive Sales & Operations Dashboard</h1>
          <p className="text-muted small mb-0">
            Analytics reported in Africa/Lagos timezone (NGN ₦)
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-end gap-2">
          <div>
            <label htmlFor="analytics-from" className="form-label small fw-semibold mb-1">
              From
            </label>
            <input
              id="analytics-from"
              type="date"
              className="form-control form-control-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="analytics-to" className="form-label small fw-semibold mb-1">
              To
            </label>
            <input
              id="analytics-to"
              type="date"
              className="form-control form-control-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading sales analytics..." />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-4">
            <div className="col">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="text-muted small text-uppercase fw-semibold">Net Revenue</div>
                  <div className="fs-4 fw-bold text-success mt-1">
                    {formatNaira(data.netRevenue)}
                  </div>
                  <div className="small text-secondary mt-1">
                    Gross: {formatNaira(data.grossRevenue)} · Refunded:{' '}
                    {formatNaira(data.refundedAmount)}
                  </div>
                </div>
              </div>
            </div>

            <div className="col">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="text-muted small text-uppercase fw-semibold">Paid Orders</div>
                  <div className="fs-4 fw-bold mt-1">{data.paidOrders}</div>
                  <div className="small text-secondary mt-1">
                    Avg Order Value: {formatNaira(data.averageOrderValue)}
                  </div>
                </div>
              </div>
            </div>

            <div className="col">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="text-muted small text-uppercase fw-semibold">
                    Low Stock Alerts
                  </div>
                  <div className="fs-4 fw-bold text-warning mt-1">{data.lowStockCount}</div>
                  <Link to="/admin/inventory?lowStockOnly=true" className="small text-success">
                    View Low Stock Variants →
                  </Link>
                </div>
              </div>
            </div>

            <div className="col">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="text-muted small text-uppercase fw-semibold">
                    Open Reconciliation
                  </div>
                  <div className="fs-4 fw-bold text-danger mt-1">
                    {data.openReconciliationCount}
                  </div>
                  <Link to="/admin/reconciliation" className="small text-danger">
                    Inspect Discrepancies →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Orders by Status */}
            <div className="col-lg-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white fw-bold">Orders by Status</div>
                <ul className="list-group list-group-flush">
                  {data.ordersByStatus.map((item) => (
                    <li
                      key={item.status}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <StatusBadge status={item.status} />
                      <span className="fw-bold">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Top Products */}
            <div className="col-lg-8">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white fw-bold">Top Selling Drinks & Packs</div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Product</th>
                        <th>Pack / Variant</th>
                        <th>SKU</th>
                        <th className="text-center">Units Sold</th>
                        <th className="text-end">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((tp) => (
                        <tr key={tp.sku}>
                          <td className="fw-semibold">{tp.productName}</td>
                          <td>{tp.variantName}</td>
                          <td>
                            <code>{tp.sku}</code>
                          </td>
                          <td className="text-center">{tp.quantity}</td>
                          <td className="text-end fw-semibold text-success">
                            {formatNaira(tp.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Daily Sales Table & Visual Bar Chart */}
            <div className="col-12">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white fw-bold">Daily Sales Breakdown</div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                        <th style={{ width: '40%' }}>Relative Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const maxRev = Math.max(1, ...data.dailySales.map((d) => d.revenue));
                        return data.dailySales.map((day) => {
                          const pct = Math.round((day.revenue / maxRev) * 100);
                          return (
                            <tr key={day.date}>
                              <td className="fw-medium">{day.date}</td>
                              <td>{day.orders}</td>
                              <td className="fw-semibold text-success">
                                {formatNaira(day.revenue)}
                              </td>
                              <td>
                                <div className="progress" style={{ height: 10 }}>
                                  <div
                                    className="progress-bar bg-success"
                                    role="progressbar"
                                    style={{ width: `${pct}%` }}
                                    aria-valuenow={pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
