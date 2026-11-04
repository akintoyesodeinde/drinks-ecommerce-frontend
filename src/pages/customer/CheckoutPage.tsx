import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressApi, checkoutApi, deliveryApi, paymentApi } from '../../api/endpoints';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { CheckoutSteps } from '../../components/common/CheckoutSteps';
import { CartSummary } from '../../components/common/CartSummary';
import { TextField, SelectField, TextAreaField } from '../../components/common/FormInput';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import {
  clearCheckoutIdempotencyKey,
  formatNaira,
  getOrCreateCheckoutIdempotencyKey,
  isValidNigerianPhone,
} from '../../utils/format';
import type {
  CheckoutPreviewDto,
  CheckoutRequest,
  CheckoutResultDto,
  DeliveryMethod,
} from '../../types/api';

const newAddressSchema = z.object({
  recipientName: z.string().min(2, 'Recipient name is required'),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(isValidNigerianPhone, 'Enter a valid Nigerian phone number (e.g. 08031234567 or +2348031234567)'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(2, 'City is required'),
  street: z.string().min(3, 'Street address is required'),
  landmark: z.string().optional(),
  postalCode: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  saveAddress: z.boolean().optional(),
});

type NewAddressFormValues = z.infer<typeof newAddressSchema>;

export const CheckoutPage: React.FC = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('Delivery');
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('new');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedPickupId, setSelectedPickupId] = useState<string>('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const [checkoutPayload, setCheckoutPayload] = useState<CheckoutRequest | null>(null);
  const [preview, setPreview] = useState<CheckoutPreviewDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<unknown>(null);

  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [pendingInitResult, setPendingInitResult] = useState<CheckoutResultDto | null>(null);
  const [retryingInit, setRetryingInit] = useState(false);

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressApi.list(),
  });

  const { data: states = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Ogun'] } = useQuery({
    queryKey: ['delivery-states'],
    queryFn: () => deliveryApi.getStates(),
  });

  const { data: pickupLocations = [] } = useQuery({
    queryKey: ['pickup-locations'],
    queryFn: () => deliveryApi.getPickupLocations(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewAddressFormValues>({
    resolver: zodResolver(newAddressSchema),
    defaultValues: {
      recipientName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
      phoneNumber: user?.phoneNumber || '',
      state: 'Lagos',
      city: '',
      street: '',
      landmark: '',
      postalCode: '',
      deliveryInstructions: '',
      saveAddress: true,
    },
  });

  const runPreview = async (payload: CheckoutRequest) => {
    setCheckoutPayload(payload);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await checkoutApi.preview(payload);
      setPreview(res);
      setStep(3);
    } catch (err) {
      setPreviewError(err);
      showToast(err instanceof Error ? err.message : 'Preview failed', 'danger');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleStep1Continue = () => {
    if (deliveryMethod === 'Delivery' && savedAddresses.length > 0 && !selectedAddressId) {
      const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      setSelectedAddressId(def.id);
      setAddressMode('saved');
    }
    if (deliveryMethod === 'Pickup' && pickupLocations.length > 0 && !selectedPickupId) {
      setSelectedPickupId(pickupLocations[0].id);
    }
    setStep(2);
  };

  const handleSavedAddressContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddressId) {
      showToast('Please select a delivery address', 'warning');
      return;
    }
    await runPreview({
      deliveryMethod: 'Delivery',
      addressId: selectedAddressId,
      deliveryInstructions: deliveryInstructions || undefined,
      contactEmail: user?.email,
      client: 'web',
    });
  };

  const handleNewAddressContinue = async (values: NewAddressFormValues) => {
    await runPreview({
      deliveryMethod: 'Delivery',
      address: {
        recipientName: values.recipientName,
        phoneNumber: values.phoneNumber,
        state: values.state,
        city: values.city,
        street: values.street,
        landmark: values.landmark || undefined,
        postalCode: values.postalCode || undefined,
        deliveryInstructions: values.deliveryInstructions || undefined,
      },
      saveAddress: values.saveAddress,
      deliveryInstructions: values.deliveryInstructions || undefined,
      contactEmail: user?.email,
      client: 'web',
    });
  };

  const handlePickupContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPickupId) {
      showToast('Please select a pickup location', 'warning');
      return;
    }
    await runPreview({
      deliveryMethod: 'Pickup',
      pickupLocationId: selectedPickupId,
      deliveryInstructions: deliveryInstructions || undefined,
      contactEmail: user?.email,
      client: 'web',
    });
  };

  const handlePlaceOrderAndPay = async () => {
    if (!checkoutPayload || submittingCheckout) return;
    setSubmittingCheckout(true);
    try {
      const idempotencyKey = getOrCreateCheckoutIdempotencyKey();
      const result = await checkoutApi.submit(checkoutPayload, idempotencyKey);
      clearCheckoutIdempotencyKey();
      await queryClient.invalidateQueries({ queryKey: ['cart'] });

      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
      } else {
        setPendingInitResult(result);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Checkout failed', 'danger');
    } finally {
      setSubmittingCheckout(false);
    }
  };

  const handleRetryPaymentInit = async () => {
    if (!pendingInitResult || retryingInit) return;
    setRetryingInit(true);
    try {
      const res = await paymentApi.initialize(pendingInitResult.orderId);
      if (res.authorizationUrl) {
        window.location.assign(res.authorizationUrl);
      } else {
        setPendingInitResult(res);
        showToast(res.message || 'Payment gateway still initializing. Try again shortly.', 'warning');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not initialize payment', 'danger');
    } finally {
      setRetryingInit(false);
    }
  };

  if (pendingInitResult) {
    return (
      <div className="container py-5">
        <div className="card shadow-sm border-warning mx-auto" style={{ maxWidth: 560 }}>
          <div className="card-body text-center p-4">
            <i
              className="bi bi-hourglass-split display-4 text-warning d-block mb-3"
              aria-hidden="true"
            />
            <h1 className="h4 fw-bold">Payment Initialization Pending</h1>
            <p className="text-muted">
              Your order <strong>{pendingInitResult.orderNumber}</strong> ({formatNaira(pendingInitResult.total)}) has been created and stock is reserved, but the payment gateway did not return a redirect link yet.
            </p>
            {pendingInitResult.message && (
              <div className="alert alert-warning small">{pendingInitResult.message}</div>
            )}
            <div className="d-flex justify-content-center gap-3 mt-3">
              <button
                type="button"
                className="btn btn-success"
                disabled={retryingInit}
                onClick={handleRetryPaymentInit}
              >
                {retryingInit ? 'Initializing...' : 'Retry Payment Now'}
              </button>
              <Link to={`/orders/${pendingInitResult.orderId}`} className="btn btn-outline-secondary">
                View Order Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h1 className="h3 fw-bold mb-3">Checkout</h1>
      <CheckoutSteps
        currentStep={step}
        onStepClick={(targetStep) => {
          setStep(targetStep);
        }}
      />

      <div className="row g-4">
        <div className="col-lg-8">
          {/* STEP 1: Fulfilment Method */}
          {step === 1 && (
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h2 className="h5 fw-bold mb-3">Choose Fulfilment Method</h2>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div
                      className={`card h-100 cursor-pointer border-2 ${
                        deliveryMethod === 'Delivery'
                          ? 'border-success bg-success bg-opacity-10'
                          : ''
                      }`}
                      onClick={() => setDeliveryMethod('Delivery')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setDeliveryMethod('Delivery')}
                    >
                      <div className="card-body">
                        <div className="form-check">
                          <input
                            id="method-delivery"
                            className="form-check-input"
                            type="radio"
                            name="deliveryMethod"
                            checked={deliveryMethod === 'Delivery'}
                            onChange={() => setDeliveryMethod('Delivery')}
                          />
                          <label htmlFor="method-delivery" className="form-check-label fw-bold">
                            Doorstep Delivery
                          </label>
                        </div>
                        <p className="small text-muted mb-0 mt-2">
                          Delivered directly to your home, office, or event venue across serviceable
                          Nigerian states.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div
                      className={`card h-100 cursor-pointer border-2 ${
                        deliveryMethod === 'Pickup'
                          ? 'border-success bg-success bg-opacity-10'
                          : ''
                      }`}
                      onClick={() => setDeliveryMethod('Pickup')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setDeliveryMethod('Pickup')}
                    >
                      <div className="card-body">
                        <div className="form-check">
                          <input
                            id="method-pickup"
                            className="form-check-input"
                            type="radio"
                            name="deliveryMethod"
                            checked={deliveryMethod === 'Pickup'}
                            onChange={() => setDeliveryMethod('Pickup')}
                          />
                          <label htmlFor="method-pickup" className="form-check-label fw-bold">
                            Store / Depot Pickup
                          </label>
                        </div>
                        <p className="small text-muted mb-0 mt-2">
                          Collect your order directly from our designated pickup depot with zero
                          delivery fee.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-success px-4"
                  onClick={handleStep1Continue}
                >
                  Continue to Address / Pickup Details
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Address or Pickup Details */}
          {step === 2 && deliveryMethod === 'Delivery' && (
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h2 className="h5 fw-bold mb-3">Delivery Address</h2>

                {savedAddresses.length > 0 && (
                  <div className="btn-group mb-4" role="group" aria-label="Address mode">
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        addressMode === 'saved' ? 'btn-success' : 'btn-outline-success'
                      }`}
                      onClick={() => setAddressMode('saved')}
                    >
                      Saved Addresses ({savedAddresses.length})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        addressMode === 'new' ? 'btn-success' : 'btn-outline-success'
                      }`}
                      onClick={() => setAddressMode('new')}
                    >
                      Enter New Address
                    </button>
                  </div>
                )}

                {addressMode === 'saved' && savedAddresses.length > 0 ? (
                  <form onSubmit={handleSavedAddressContinue}>
                    <div className="row g-3 mb-3">
                      {savedAddresses.map((addr) => (
                        <div key={addr.id} className="col-md-6">
                          <label
                            className={`card h-100 p-3 cursor-pointer ${
                              selectedAddressId === addr.id
                                ? 'border-success bg-success bg-opacity-10'
                                : ''
                            }`}
                          >
                            <div className="form-check">
                              <input
                                type="radio"
                                className="form-check-input"
                                name="savedAddress"
                                value={addr.id}
                                checked={selectedAddressId === addr.id}
                                onChange={() => setSelectedAddressId(addr.id)}
                              />
                              <span className="form-check-label fw-bold">
                                {addr.label || addr.recipientName}
                                {addr.isDefault && (
                                  <span className="badge text-bg-secondary ms-2">Default</span>
                                )}
                              </span>
                            </div>
                            <div className="small text-muted mt-1">
                              <div>{addr.recipientName} · {addr.phoneNumber}</div>
                              <div>{addr.street}</div>
                              <div>
                                {addr.city}, {addr.state}
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>

                    <TextAreaField
                      label="Delivery Instructions (Optional)"
                      rows={2}
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                    />

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={previewLoading}
                      >
                        {previewLoading ? 'Calculating Totals...' : 'Review Order'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit(handleNewAddressContinue)} noValidate>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <TextField
                          label="Recipient Full Name"
                          required
                          error={errors.recipientName?.message}
                          {...register('recipientName')}
                        />
                      </div>
                      <div className="col-md-6">
                        <TextField
                          label="Nigerian Phone Number"
                          placeholder="08031234567 or +2348031234567"
                          required
                          error={errors.phoneNumber?.message}
                          {...register('phoneNumber')}
                        />
                      </div>
                      <div className="col-md-6">
                        <SelectField
                          label="State"
                          required
                          options={states.map((s) => ({ value: s, label: s }))}
                          error={errors.state?.message}
                          {...register('state')}
                        />
                      </div>
                      <div className="col-md-6">
                        <TextField
                          label="City / Town"
                          placeholder="e.g. Ikeja, Lekki, Wuse"
                          required
                          error={errors.city?.message}
                          {...register('city')}
                        />
                      </div>
                      <div className="col-12">
                        <TextField
                          label="Street Address"
                          placeholder="House number and street name"
                          required
                          error={errors.street?.message}
                          {...register('street')}
                        />
                      </div>
                      <div className="col-md-6">
                        <TextField
                          label="Nearest Landmark"
                          placeholder="Optional landmark"
                          error={errors.landmark?.message}
                          {...register('landmark')}
                        />
                      </div>
                      <div className="col-md-6">
                        <TextField
                          label="Postal Code"
                          placeholder="Optional postal code"
                          error={errors.postalCode?.message}
                          {...register('postalCode')}
                        />
                      </div>
                      <div className="col-12">
                        <TextAreaField
                          label="Delivery Instructions"
                          rows={2}
                          placeholder="Gate code, call on arrival, etc."
                          error={errors.deliveryInstructions?.message}
                          {...register('deliveryInstructions')}
                        />
                      </div>
                      <div className="col-12">
                        <div className="form-check mb-3">
                          <input
                            id="save-address-check"
                            type="checkbox"
                            className="form-check-input"
                            {...register('saveAddress')}
                          />
                          <label htmlFor="save-address-check" className="form-check-label">
                            Save this address to my address book
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={previewLoading}
                      >
                        {previewLoading ? 'Calculating Totals...' : 'Review Order'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {step === 2 && deliveryMethod === 'Pickup' && (
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h2 className="h5 fw-bold mb-3">Select Pickup Location</h2>
                {pickupLocations.length === 0 ? (
                  <div className="alert alert-warning">
                    Store pickup is currently unavailable. Please go back and choose Doorstep
                    Delivery.
                  </div>
                ) : (
                  <form onSubmit={handlePickupContinue}>
                    <div className="list-group mb-3">
                      {pickupLocations.map((loc) => (
                        <label
                          key={loc.id}
                          className={`list-group-item list-group-item-action ${
                            selectedPickupId === loc.id ? 'active' : ''
                          }`}
                        >
                          <div className="d-flex w-100 justify-content-between">
                            <div className="form-check">
                              <input
                                type="radio"
                                className="form-check-input"
                                name="pickupLocation"
                                value={loc.id}
                                checked={selectedPickupId === loc.id}
                                onChange={() => setSelectedPickupId(loc.id)}
                              />
                              <span className="form-check-label fw-bold">{loc.name}</span>
                            </div>
                            <small>{loc.openingHours}</small>
                          </div>
                          <p className="mb-1 small">
                            {loc.address}, {loc.city}, {loc.state}
                          </p>
                          <small>Phone: {loc.phoneNumber}</small>
                        </label>
                      ))}
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={previewLoading}
                      >
                        {previewLoading ? 'Calculating...' : 'Review Order'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Review & Pay */}
          {step === 3 && (
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h2 className="h5 fw-bold mb-3">Review Your Order</h2>
                {previewLoading ? (
                  <LoadingSpinner label="Verifying stock and delivery fee..." />
                ) : previewError ? (
                  <ErrorState error={previewError} />
                ) : preview ? (
                  <>
                    {/* Serviceability Banner */}
                    <div
                      className={`alert ${
                        preview.serviceable ? 'alert-success' : 'alert-danger'
                      }`}
                      role="alert"
                      data-testid="checkout-serviceability-alert"
                    >
                      <div className="fw-bold">
                        {preview.serviceable
                          ? 'Location Serviceable'
                          : 'Delivery Location Not Serviceable'}
                      </div>
                      {preview.message && <div>{preview.message}</div>}
                      {preview.serviceable &&
                        preview.estimatedMinDays !== null &&
                        preview.estimatedMaxDays !== null && (
                          <div className="small">
                            Estimated Delivery: {preview.estimatedMinDays}–{preview.estimatedMaxDays}{' '}
                            day(s)
                          </div>
                        )}
                    </div>

                    {preview.warnings.length > 0 && (
                      <div className="alert alert-warning">
                        <ul className="mb-0 small">
                          {preview.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="table-responsive mb-3">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Drink / Pack</th>
                            <th className="text-center">Qty</th>
                            <th className="text-end">Unit Price</th>
                            <th className="text-end">Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.items.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <div className="fw-semibold">{item.productName}</div>
                                <div className="small text-muted">{item.variantName}</div>
                              </td>
                              <td className="text-center">{item.quantity}</td>
                              <td className="text-end">{formatNaira(item.unitPrice)}</td>
                              <td className="text-end fw-semibold">
                                {formatNaira(item.lineTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        disabled={submittingCheckout}
                        onClick={() => setStep(2)}
                      >
                        Change Address / Method
                      </button>
                      <button
                        type="button"
                        className="btn btn-success btn-lg px-4 fw-bold"
                        disabled={!preview.serviceable || submittingCheckout}
                        onClick={handlePlaceOrderAndPay}
                      >
                        {submittingCheckout
                          ? 'Processing Order...'
                          : `Pay ${formatNaira(preview.total)} with Paystack`}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="col-lg-4">
          <CartSummary
            subtotal={preview ? preview.subtotal : cart.subtotal}
            discount={preview ? preview.discount : cart.discount}
            couponCode={preview ? preview.couponCode : cart.couponCode}
            deliveryFee={preview ? preview.deliveryFee : undefined}
            tax={preview ? preview.tax : undefined}
            total={preview ? preview.total : cart.total}
          />
        </div>
      </div>
    </div>
  );
};
