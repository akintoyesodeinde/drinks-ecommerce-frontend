import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { deliveryApi } from '../../api/endpoints';
import { CartSummary } from '../../components/common/CartSummary';
import { Price } from '../../components/common/Price';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatNaira } from '../../utils/format';
import type { DeliveryEstimateDto } from '../../types/api';

export const CartPage: React.FC = () => {
  const { cart, isLoading, updateQuantity, removeItem, clearCart, applyCoupon, removeCoupon } =
    useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Delivery estimate widget state
  const [estState, setEstState] = useState('Lagos');
  const [estCity, setEstCity] = useState('Ikeja');
  const [estimate, setEstimate] = useState<DeliveryEstimateDto | null>(null);
  const [estimating, setEstimating] = useState(false);

  const { data: states = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Kano'] } = useQuery({
    queryKey: ['delivery-states'],
    queryFn: () => deliveryApi.getStates(),
  });

  if (isLoading) return <LoadingSpinner fullPage label="Loading your cart..." />;

  if (cart.items.length === 0) {
    return (
      <div className="container py-5">
        <EmptyState
          icon="bi-cart-x"
          title="Your cart is empty"
          description="Browse our catalog of soft drinks, water, juices, and bulk packs to start your order."
          action={
            <Link to="/products" className="btn btn-success">
              Explore Drinks Catalog
            </Link>
          }
        />
      </div>
    );
  }

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError(null);
    setCouponLoading(true);
    try {
      await applyCoupon(couponInput.trim());
      setCouponInput('');
      showToast('Coupon applied!', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid coupon code';
      setCouponError(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponLoading(true);
    try {
      await removeCoupon();
      showToast('Coupon removed', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove coupon', 'danger');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estState || !estCity.trim()) return;
    setEstimating(true);
    try {
      const res = await deliveryApi.getEstimate(estState, estCity.trim(), cart.subtotal);
      setEstimate(res);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not estimate delivery', 'danger');
    } finally {
      setEstimating(false);
    }
  };

  const handleProceedCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login?returnUrl=%2Fcheckout');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0">Shopping Cart ({cart.itemCount} items)</h1>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => void clearCart()}
        >
          Clear Cart
        </button>
      </div>

      {cart.warnings.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <div className="fw-bold mb-1">
            <i className="bi bi-exclamation-circle me-1" aria-hidden="true" />
            Cart Updates
          </div>
          <ul className="mb-0 small">
            {cart.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 mb-4">
            <div className="list-group list-group-flush">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="list-group-item p-3 d-flex flex-wrap align-items-center justify-content-between gap-3"
                  data-testid={`cart-item-${item.variantId}`}
                >
                  <div className="d-flex align-items-center gap-3" style={{ minWidth: 240 }}>
                    <div
                      className="bg-light rounded border d-flex align-items-center justify-content-center p-2"
                      style={{ width: 64, height: 64 }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-100 h-100 object-fit-contain"
                        />
                      ) : (
                        <i className="bi bi-cup-straw fs-4 text-secondary" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <Link
                        to={`/products/${item.productSlug}`}
                        className="fw-bold text-dark text-decoration-none d-block"
                      >
                        {item.productName}
                      </Link>
                      <div className="small text-muted">
                        {item.variantName} · <code>{item.sku}</code>
                      </div>
                      <div className="mt-1 d-flex align-items-center gap-2">
                        <Price amount={item.unitPrice} size="sm" />
                        <StatusBadge status={item.stockStatus} />
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3 ms-auto">
                    <div className="input-group input-group-sm" style={{ width: 115 }}>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        aria-label={`Decrease quantity for ${item.productName}`}
                        disabled={item.quantity <= 1}
                        onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        className="form-control text-center"
                        aria-label={`Quantity for ${item.productName}`}
                        value={item.quantity}
                        min={1}
                        max={99}
                        onChange={(e) =>
                          void updateQuantity(item.id, Number(e.target.value) || 1)
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        aria-label={`Increase quantity for ${item.productName}`}
                        disabled={item.quantity >= Math.min(99, item.availableQuantity)}
                        onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-end" style={{ minWidth: 110 }}>
                      <div className="fw-bold text-success">{formatNaira(item.lineTotal)}</div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      aria-label={`Remove ${item.productName}`}
                      onClick={() => void removeItem(item.id)}
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Estimator Widget */}
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h6 fw-bold mb-3">
                <i className="bi bi-truck me-2 text-success" aria-hidden="true" />
                Estimate Delivery Fee & Timeline
              </h2>
              <form className="row g-2 align-items-end" onSubmit={handleCheckEstimate}>
                <div className="col-sm-5">
                  <label htmlFor="est-state" className="form-label small fw-semibold">
                    State
                  </label>
                  <select
                    id="est-state"
                    className="form-select form-select-sm"
                    value={estState}
                    onChange={(e) => setEstState(e.target.value)}
                  >
                    {states.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-sm-4">
                  <label htmlFor="est-city" className="form-label small fw-semibold">
                    City / Town
                  </label>
                  <input
                    id="est-city"
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Ikeja, Lekki"
                    value={estCity}
                    onChange={(e) => setEstCity(e.target.value)}
                  />
                </div>
                <div className="col-sm-3">
                  <button
                    type="submit"
                    className="btn btn-outline-success btn-sm w-100"
                    disabled={estimating}
                  >
                    {estimating ? 'Checking...' : 'Check Fee'}
                  </button>
                </div>
              </form>

              {estimate && (
                <div
                  className={`alert mt-3 mb-0 py-2 small ${
                    estimate.serviceable ? 'alert-success' : 'alert-danger'
                  }`}
                  data-testid="delivery-estimate-result"
                >
                  <div className="fw-bold">
                    {estimate.serviceable
                      ? `Delivery Fee: ${
                          estimate.freeDeliveryApplied ? 'FREE' : formatNaira(estimate.fee)
                        }`
                      : 'Delivery Unavailable'}
                  </div>
                  <div>{estimate.message}</div>
                  {estimate.serviceable &&
                    estimate.estimatedMinDays !== null &&
                    estimate.estimatedMaxDays !== null && (
                      <div className="text-muted">
                        Estimated arrival: {estimate.estimatedMinDays}–{estimate.estimatedMaxDays}{' '}
                        day(s)
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coupon & Summary */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-body">
              <h2 className="h6 fw-bold mb-2">Promo / Coupon Code</h2>
              {!isAuthenticated ? (
                <p className="small text-muted mb-0">
                  <Link to="/login?returnUrl=%2Fcart">Sign in</Link> to apply a coupon code.
                </p>
              ) : cart.couponCode ? (
                <div className="d-flex justify-content-between align-items-center bg-success bg-opacity-10 p-2 rounded border border-success">
                  <span className="small fw-semibold text-success">
                    Applied: <strong>{cart.couponCode}</strong> (-{formatNaira(cart.discount)})
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={couponLoading}
                    onClick={() => void handleRemoveCoupon()}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon}>
                  <div className="input-group input-group-sm">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter code (e.g. WELCOME10)"
                      aria-label="Coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn btn-dark"
                      disabled={couponLoading || !couponInput.trim()}
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <div className="text-danger small mt-1" role="alert">
                      {couponError}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>

          <CartSummary
            subtotal={cart.subtotal}
            discount={cart.discount}
            couponCode={cart.couponCode}
            deliveryFee={estimate?.serviceable ? estimate.fee : undefined}
            total={cart.total + (estimate?.serviceable ? estimate.fee : 0)}
            footerAction={
              <button
                type="button"
                className="btn btn-success btn-lg w-100 fw-semibold"
                onClick={handleProceedCheckout}
              >
                Proceed to Checkout
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
};
