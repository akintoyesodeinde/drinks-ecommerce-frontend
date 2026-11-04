import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, deliveryApi } from '../../api/endpoints';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { formatLagosDateTime, formatNaira } from '../../utils/format';
import type {
  AdminDeliveryZoneDto,
  CouponDto,
  DiscountType,
  FeeRuleDto,
} from '../../types/api';

// 1. Admin Coupons Page (/admin/coupons)
export const AdminCouponsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<CouponDto | null>(null);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('Percentage');
  const [value, setValue] = useState<number>(10);
  const [minOrderAmount, setMinOrderAmount] = useState<string>('5000');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('2000');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => adminApi.listCoupons(),
  });

  const handleEdit = (c: CouponDto) => {
    setEditing(c);
    setCode(c.code);
    setDescription(c.description || '');
    setDiscountType(c.discountType);
    setValue(c.value);
    setMinOrderAmount(c.minOrderAmount ? String(c.minOrderAmount) : '');
    setMaxDiscountAmount(c.maxDiscountAmount ? String(c.maxDiscountAmount) : '');
    setUsageLimit(c.usageLimit ? String(c.usageLimit) : '');
    setIsActive(c.isActive);
  };

  const resetForm = () => {
    setEditing(null);
    setCode('');
    setDescription('');
    setDiscountType('Percentage');
    setValue(10);
    setMinOrderAmount('5000');
    setMaxDiscountAmount('2000');
    setUsageLimit('');
    setIsActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discountType,
        value,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        isActive,
      };
      if (editing) {
        await adminApi.updateCoupon(editing.id, payload);
        showToast('Coupon updated!', 'success');
      } else {
        await adminApi.createCoupon(payload);
        showToast('Coupon created!', 'success');
      }
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'danger');
    }
  };

  return (
    <div>
      <h1 className="h3 fw-bold mb-4">Coupons & Discounts</h1>
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-bold">
              {editing ? `Edit Coupon: ${editing.code}` : 'Create Coupon'}
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="form-label small fw-bold">Coupon Code</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-bold">Description</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small fw-bold">Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    >
                      <option value="Percentage">Percentage (%)</option>
                      <option value="FixedAmount">Fixed Amount (₦)</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold">Value</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      required
                      value={value}
                      onChange={(e) => setValue(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small fw-bold">Min Order (₦)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold">Max Discount (₦)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-check mb-3">
                  <input
                    id="coupon-active"
                    type="checkbox"
                    className="form-check-input"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor="coupon-active" className="form-check-label small">
                    Active
                  </label>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-sm btn-success">
                    {editing ? 'Update' : 'Create'}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          {isLoading ? (
            <LoadingSpinner label="Loading coupons..." />
          ) : (
            <div className="card shadow-sm border-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Discount</th>
                      <th>Min Order</th>
                      <th>Used</th>
                      <th>Status</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id}>
                        <td className="fw-bold">
                          <code>{c.code}</code>
                        </td>
                        <td>
                          {c.discountType === 'Percentage'
                            ? `${c.value}%`
                            : formatNaira(c.value)}
                        </td>
                        <td>{c.minOrderAmount ? formatNaira(c.minOrderAmount) : 'None'}</td>
                        <td>{c.usedCount}</td>
                        <td>
                          <span
                            className={`badge text-bg-${c.isActive ? 'success' : 'secondary'}`}
                          >
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            onClick={() => handleEdit(c)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. Admin Delivery Zones Page (/admin/delivery-zones)
export const AdminDeliveryZonesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminDeliveryZoneDto | null>(null);
  const [name, setName] = useState('');
  const [state, setState] = useState('Lagos');
  const [citiesText, setCitiesText] = useState('Ikeja, Lekki, Victoria Island');
  const [baseFee, setBaseFee] = useState(2500);
  const [freeThreshold, setFreeThreshold] = useState('50000');
  const [minDays, setMinDays] = useState(1);
  const [maxDays, setMaxDays] = useState(2);
  const [isActive, setIsActive] = useState(true);
  const [feeRules, setFeeRules] = useState<FeeRuleDto[]>([]);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['admin-delivery-zones'],
    queryFn: () => adminApi.listDeliveryZones(),
  });

  const { data: states = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo'] } = useQuery({
    queryKey: ['delivery-states'],
    queryFn: () => deliveryApi.getStates(),
  });

  const handleEdit = (z: AdminDeliveryZoneDto) => {
    setEditing(z);
    setName(z.name);
    setState(z.state);
    setCitiesText(z.cities.join(', '));
    setBaseFee(z.baseFee);
    setFreeThreshold(z.freeDeliveryThreshold ? String(z.freeDeliveryThreshold) : '');
    setMinDays(z.estimatedMinDays);
    setMaxDays(z.estimatedMaxDays);
    setIsActive(z.isActive);
    setFeeRules(z.feeRules || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: name.trim(),
        state,
        cities: citiesText
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        baseFee,
        freeDeliveryThreshold: freeThreshold ? Number(freeThreshold) : null,
        estimatedMinDays: minDays,
        estimatedMaxDays: maxDays,
        isActive,
        feeRules,
      };
      if (editing) {
        await adminApi.updateDeliveryZone(editing.id, payload);
        showToast('Delivery zone updated!', 'success');
      } else {
        await adminApi.createDeliveryZone(payload);
        showToast('Delivery zone created!', 'success');
      }
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-delivery-zones'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'danger');
    }
  };

  return (
    <div>
      <h1 className="h3 fw-bold mb-4">Delivery Zones & Fee Rules</h1>
      <div className="row g-4">
        <div className="col-md-5">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-bold">
              {editing ? `Edit Zone: ${editing.name}` : 'Create Delivery Zone'}
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="form-label small fw-bold">Zone Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-bold">State</label>
                  <select
                    className="form-select form-select-sm"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    {states.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-bold">Cities (comma-separated)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={citiesText}
                    onChange={(e) => setCitiesText(e.target.value)}
                  />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small fw-bold">Base Fee (₦)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      required
                      value={baseFee}
                      onChange={(e) => setBaseFee(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold">Free Above (₦)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={freeThreshold}
                      onChange={(e) => setFreeThreshold(e.target.value)}
                    />
                  </div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small fw-bold">Min Days</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={minDays}
                      onChange={(e) => setMinDays(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold">Max Days</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={maxDays}
                      onChange={(e) => setMaxDays(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Fee Rules */}
                <div className="mb-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small fw-bold">Tiered Fee Rules</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary py-0"
                      onClick={() =>
                        setFeeRules((prev) => [
                          ...prev,
                          { minOrderAmount: 0, maxOrderAmount: 20000, fee: 2000 },
                        ])
                      }
                    >
                      + Rule
                    </button>
                  </div>
                  {feeRules.map((rule, idx) => (
                    <div key={idx} className="row g-1 mb-1">
                      <div className="col-4">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Min ₦"
                          value={rule.minOrderAmount}
                          onChange={(e) =>
                            setFeeRules((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, minOrderAmount: Number(e.target.value) } : r,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="col-4">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Fee ₦"
                          value={rule.fee}
                          onChange={(e) =>
                            setFeeRules((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, fee: Number(e.target.value) } : r,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="col-4">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger w-100"
                          onClick={() =>
                            setFeeRules((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-check mb-3">
                  <input
                    id="zone-active"
                    type="checkbox"
                    className="form-check-input"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor="zone-active" className="form-check-label small">
                    Active
                  </label>
                </div>

                <button type="submit" className="btn btn-sm btn-success">
                  {editing ? 'Update Zone' : 'Create Zone'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-7">
          {isLoading ? (
            <LoadingSpinner label="Loading delivery zones..." />
          ) : (
            <div className="card shadow-sm border-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Zone</th>
                      <th>State & Cities</th>
                      <th>Base Fee</th>
                      <th>ETA</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((z) => (
                      <tr key={z.id}>
                        <td className="fw-bold">{z.name}</td>
                        <td className="small">
                          <strong>{z.state}:</strong> {z.cities.join(', ')}
                        </td>
                        <td>{formatNaira(z.baseFee)}</td>
                        <td className="small">
                          {z.estimatedMinDays}–{z.estimatedMaxDays}d
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            onClick={() => handleEdit(z)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. Admin Audit Logs Page (/admin/audit-logs)
export const AdminAuditLogsPage: React.FC = () => {
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', { entityType, page }],
    queryFn: () =>
      adminApi.listAuditLogs({
        entityType: entityType || undefined,
        page,
        pageSize: 20,
      }),
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0">Security & Operations Audit Logs</h1>
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ width: 240 }}
          placeholder="Filter by entityType (e.g. Order)"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading audit logs..." />
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((log) => (
                  <tr key={log.id}>
                    <td className="small text-muted text-nowrap">
                      {formatLagosDateTime(log.createdAt)}
                    </td>
                    <td className="small fw-medium">{log.actor || 'System'}</td>
                    <td>
                      <span className="badge text-bg-light border text-dark">{log.action}</span>
                    </td>
                    <td className="small">
                      {log.entityType} {log.entityId ? `(${log.entityId})` : ''}
                    </td>
                    <td className="small text-muted">{log.details || '—'}</td>
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
