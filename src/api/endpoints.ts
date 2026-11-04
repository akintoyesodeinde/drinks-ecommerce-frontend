import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type {
  AddressDto,
  AddressInput,
  AdminCategoryDto,
  AdminDeliveryZoneDto,
  AdminOrderDetailDto,
  AdminOrderSummaryDto,
  AdminPaymentDetailDto,
  AdminPaymentDto,
  AdminProductDto,
  AdminProductSummaryDto,
  AssignDeliveryRequest,
  AuditLogDto,
  AuthResponse,
  CartDto,
  CategoryDto,
  CategoryInput,
  ChangePasswordRequest,
  CheckoutPreviewDto,
  CheckoutRequest,
  CheckoutResultDto,
  CouponDto,
  CouponInput,
  CreateProductRequest,
  CreateRefundRequest,
  DeliveryDto,
  DeliveryEstimateDto,
  DeliveryExceptionReason,
  DeliveryStaffDto,
  DeliveryStatus,
  DeliveryZoneDto,
  DeliveryZoneInput,
  InventoryAdjustRequest,
  InventoryItemDto,
  InventoryTransactionDto,
  LoginRequest,
  NotificationDto,
  OrderDetailDto,
  OrderStatus,
  OrderSummaryDto,
  Paged,
  PaymentStatus,
  PaymentStatusDto,
  PickupLocationDto,
  ProductDetailDto,
  ProductQueryParams,
  ProductSummaryDto,
  PromotionDto,
  ReconciliationRecordDto,
  ReconciliationStatus,
  ReconciliationType,
  RefundDto,
  RefundStatus,
  RegisterRequest,
  SalesSummaryDto,
  TrackingDto,
  UpdateProductRequest,
  UpdateProfileRequest,
  UserDto,
  VariantInput,
} from '../types/api';

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// 3. Auth & Account
export const authApi = {
  register: (data: RegisterRequest) =>
    apiPost<AuthResponse>('/auth/register', data, { skipAuthRefresh: true }),
  login: (data: LoginRequest) =>
    apiPost<AuthResponse>('/auth/login', data, { skipAuthRefresh: true }),
  logout: (refreshToken: string) =>
    apiPost<void>('/auth/logout', { refreshToken }, { skipAuthRefresh: true }),
  forgotPassword: (email: string) =>
    apiPost<void>('/auth/forgot-password', { email }, { skipAuthRefresh: true }),
  resetPassword: (data: { email: string; token: string; newPassword: string }) =>
    apiPost<void>('/auth/reset-password', data, { skipAuthRefresh: true }),
  confirmEmail: (data: { userId: string; token: string }) =>
    apiPost<void>('/auth/confirm-email', data, { skipAuthRefresh: true }),
  resendConfirmation: () => apiPost<void>('/auth/resend-confirmation'),
  getProfile: () => apiGet<UserDto>('/account/profile'),
  updateProfile: (data: UpdateProfileRequest) => apiPut<UserDto>('/account/profile', data),
  changePassword: (data: ChangePasswordRequest) =>
    apiPost<void>('/account/change-password', data),
};

// 4. Addresses
export const addressApi = {
  list: () => apiGet<AddressDto[]>('/account/addresses'),
  create: (data: AddressInput) => apiPost<AddressDto>('/account/addresses', data),
  update: (id: string, data: AddressInput) =>
    apiPut<AddressDto>(`/account/addresses/${encodeURIComponent(id)}`, data),
  remove: (id: string) => apiDelete<void>(`/account/addresses/${encodeURIComponent(id)}`),
};

// 5. Catalog
export const catalogApi = {
  getProducts: (params: ProductQueryParams = {}) =>
    apiGet<Paged<ProductSummaryDto>>(
      `/products${buildQuery(params as Record<string, string | number | boolean | undefined>)}`,
    ),
  getProduct: (idOrSlug: string) =>
    apiGet<ProductDetailDto>(`/products/${encodeURIComponent(idOrSlug)}`),
  getCategories: () => apiGet<CategoryDto[]>('/categories'),
  getCategory: (idOrSlug: string) =>
    apiGet<CategoryDto>(`/categories/${encodeURIComponent(idOrSlug)}`),
  getCategoryProducts: (
    idOrSlug: string,
    params: { sort?: string; page?: number; pageSize?: number; search?: string } = {},
  ) =>
    apiGet<Paged<ProductSummaryDto>>(
      `/categories/${encodeURIComponent(idOrSlug)}/products${buildQuery(params)}`,
    ),
  getBrands: () => apiGet<string[]>('/brands'),
  getActivePromotions: () => apiGet<PromotionDto[]>('/promotions/active'),
};

// 6. Cart
export const cartApi = {
  get: () => apiGet<CartDto>('/cart'),
  addItem: (variantId: string, quantity: number) =>
    apiPost<CartDto>('/cart/items', { variantId, quantity }),
  updateItem: (itemId: string, quantity: number) =>
    apiPut<CartDto>(`/cart/items/${encodeURIComponent(itemId)}`, { quantity }),
  removeItem: (itemId: string) =>
    apiDelete<CartDto>(`/cart/items/${encodeURIComponent(itemId)}`),
  clear: () => apiDelete<void>('/cart'),
  applyCoupon: (code: string) => apiPost<CartDto>('/cart/coupon', { code }),
  removeCoupon: () => apiDelete<CartDto>('/cart/coupon'),
  merge: (items: { variantId: string; quantity: number }[]) =>
    apiPost<CartDto>('/cart/merge', { items }),
};

// 7. Delivery
export const deliveryApi = {
  getZones: () => apiGet<DeliveryZoneDto[]>('/delivery/zones'),
  getEstimate: (state: string, city: string, subtotal: number) =>
    apiGet<DeliveryEstimateDto>(
      `/delivery/estimate${buildQuery({ state, city, subtotal })}`,
    ),
  getPickupLocations: () => apiGet<PickupLocationDto[]>('/delivery/pickup-locations'),
  getStates: () => apiGet<string[]>('/delivery/states'),
};

// 8. Checkout
export const checkoutApi = {
  preview: (data: CheckoutRequest) =>
    apiPost<CheckoutPreviewDto>('/checkout/preview', { ...data, client: 'web' }),
  submit: (data: CheckoutRequest, idempotencyKey: string) =>
    apiPost<CheckoutResultDto>(
      '/checkout',
      { ...data, client: 'web' },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),
};

// 9. Payments
export const paymentApi = {
  initialize: (orderId: string) =>
    apiPost<CheckoutResultDto>('/payments/initialize', { orderId, client: 'web' }),
  verify: (reference: string) =>
    apiGet<PaymentStatusDto>(`/payments/${encodeURIComponent(reference)}/verify`),
  getStatus: (reference: string) =>
    apiGet<PaymentStatusDto>(`/payments/${encodeURIComponent(reference)}`),
};

// 10. Orders & Tracking
export const ordersApi = {
  list: (params: { status?: OrderStatus | ''; page?: number; pageSize?: number } = {}) =>
    apiGet<Paged<OrderSummaryDto>>(`/orders${buildQuery(params)}`),
  get: (id: string) => apiGet<OrderDetailDto>(`/orders/${encodeURIComponent(id)}`),
  cancel: (id: string, reason?: string) =>
    apiPost<OrderDetailDto>(`/orders/${encodeURIComponent(id)}/cancel`, { reason }),
  getTracking: (id: string) =>
    apiGet<TrackingDto>(`/orders/${encodeURIComponent(id)}/tracking`),
};

// 11. Notifications
export const notificationsApi = {
  list: (params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) =>
    apiGet<Paged<NotificationDto>>(`/notifications${buildQuery(params)}`),
  getUnreadCount: () => apiGet<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) =>
    apiPost<void>(`/notifications/${encodeURIComponent(id)}/read`),
  markAllRead: () => apiPost<void>('/notifications/read-all'),
};

// 12. Administration
export const adminApi = {
  // Products
  listProducts: (
    params: {
      search?: string;
      categoryId?: string;
      includeInactive?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ) => apiGet<Paged<AdminProductSummaryDto>>(`/admin/products${buildQuery(params)}`),
  getProduct: (id: string) =>
    apiGet<AdminProductDto>(`/admin/products/${encodeURIComponent(id)}`),
  createProduct: (data: CreateProductRequest) =>
    apiPost<AdminProductDto>('/admin/products', data),
  updateProduct: (id: string, data: UpdateProductRequest) =>
    apiPut<AdminProductDto>(`/admin/products/${encodeURIComponent(id)}`, data),
  deleteProduct: (id: string) =>
    apiDelete<void>(`/admin/products/${encodeURIComponent(id)}`),
  addVariant: (productId: string, data: VariantInput) =>
    apiPost<AdminProductDto>(
      `/admin/products/${encodeURIComponent(productId)}/variants`,
      data,
    ),
  updateVariant: (productId: string, variantId: string, data: VariantInput) =>
    apiPut<AdminProductDto>(
      `/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
      data,
    ),
  uploadProductImage: (productId: string, file: File, altText?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (altText) formData.append('altText', altText);
    return apiPost<AdminProductDto>(
      `/admin/products/${encodeURIComponent(productId)}/images`,
      formData,
    );
  },
  deleteProductImage: (productId: string, imageId: string) =>
    apiDelete<AdminProductDto>(
      `/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
    ),

  // Categories
  listCategories: () => apiGet<AdminCategoryDto[]>('/admin/categories'),
  createCategory: (data: CategoryInput) =>
    apiPost<AdminCategoryDto>('/admin/categories', data),
  updateCategory: (id: string, data: CategoryInput) =>
    apiPut<AdminCategoryDto>(`/admin/categories/${encodeURIComponent(id)}`, data),
  deleteCategory: (id: string) =>
    apiDelete<void>(`/admin/categories/${encodeURIComponent(id)}`),

  // Inventory
  listInventory: (
    params: { search?: string; lowStockOnly?: boolean; page?: number; pageSize?: number } = {},
  ) => apiGet<Paged<InventoryItemDto>>(`/admin/inventory${buildQuery(params)}`),
  adjustInventory: (variantId: string, data: InventoryAdjustRequest) =>
    apiPost<InventoryItemDto>(
      `/admin/inventory/${encodeURIComponent(variantId)}/adjust`,
      data,
    ),
  updateThreshold: (variantId: string, lowStockThreshold: number) =>
    apiPut<InventoryItemDto>(
      `/admin/inventory/${encodeURIComponent(variantId)}/threshold`,
      { lowStockThreshold },
    ),
  listInventoryTransactions: (
    variantId: string,
    params: { page?: number; pageSize?: number } = {},
  ) =>
    apiGet<Paged<InventoryTransactionDto>>(
      `/admin/inventory/${encodeURIComponent(variantId)}/transactions${buildQuery(params)}`,
    ),

  // Orders
  listOrders: (
    params: {
      status?: OrderStatus | '';
      search?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) => apiGet<Paged<AdminOrderSummaryDto>>(`/admin/orders${buildQuery(params)}`),
  getOrder: (id: string) =>
    apiGet<AdminOrderDetailDto>(`/admin/orders/${encodeURIComponent(id)}`),
  updateOrderStatus: (
    id: string,
    status: 'Processing' | 'ReadyForDispatch' | 'Delivered',
    note?: string,
  ) =>
    apiPost<AdminOrderDetailDto>(`/admin/orders/${encodeURIComponent(id)}/status`, {
      status,
      note,
    }),
  approveCancellation: (id: string, note?: string) =>
    apiPost<AdminOrderDetailDto>(
      `/admin/orders/${encodeURIComponent(id)}/cancellation/approve`,
      { note },
    ),
  rejectCancellation: (id: string, note?: string) =>
    apiPost<AdminOrderDetailDto>(
      `/admin/orders/${encodeURIComponent(id)}/cancellation/reject`,
      { note },
    ),

  // Deliveries
  listDeliveries: (
    params: { status?: DeliveryStatus | ''; page?: number; pageSize?: number } = {},
  ) => apiGet<Paged<DeliveryDto>>(`/admin/deliveries${buildQuery(params)}`),
  listDeliveryStaff: () => apiGet<DeliveryStaffDto[]>('/admin/deliveries/staff'),
  assignDelivery: (orderId: string, data: AssignDeliveryRequest) =>
    apiPost<DeliveryDto>(
      `/admin/deliveries/${encodeURIComponent(orderId)}/assign`,
      data,
    ),
  dispatchDelivery: (orderId: string, note?: string) =>
    apiPost<DeliveryDto>(
      `/admin/deliveries/${encodeURIComponent(orderId)}/dispatch`,
      { note },
    ),
  markDelivered: (orderId: string, receivedBy?: string, note?: string) =>
    apiPost<DeliveryDto>(
      `/admin/deliveries/${encodeURIComponent(orderId)}/deliver`,
      { receivedBy, note },
    ),
  recordDeliveryException: (
    orderId: string,
    reason: DeliveryExceptionReason,
    note?: string,
  ) =>
    apiPost<DeliveryDto>(
      `/admin/deliveries/${encodeURIComponent(orderId)}/exception`,
      { reason, note },
    ),

  // Payments, Refunds, Reconciliation
  listPayments: (
    params: {
      status?: PaymentStatus | '';
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) => apiGet<Paged<AdminPaymentDto>>(`/admin/payments${buildQuery(params)}`),
  getPayment: (id: string) =>
    apiGet<AdminPaymentDetailDto>(`/admin/payments/${encodeURIComponent(id)}`),
  reverifyPayment: (reference: string) =>
    apiPost<PaymentStatusDto>(
      `/admin/payments/${encodeURIComponent(reference)}/reverify`,
    ),
  listRefunds: (
    params: { status?: RefundStatus | ''; page?: number; pageSize?: number } = {},
  ) => apiGet<Paged<RefundDto>>(`/admin/refunds${buildQuery(params)}`),
  createRefund: (data: CreateRefundRequest) =>
    apiPost<RefundDto>('/admin/refunds', data),
  syncRefund: (id: string) =>
    apiPost<RefundDto>(`/admin/refunds/${encodeURIComponent(id)}/sync`),
  listReconciliation: (
    params: {
      status?: ReconciliationStatus | '';
      type?: ReconciliationType | '';
      page?: number;
      pageSize?: number;
    } = {},
  ) =>
    apiGet<Paged<ReconciliationRecordDto>>(
      `/admin/reconciliation${buildQuery(params)}`,
    ),
  runReconciliation: () =>
    apiPost<{ paymentsChecked: number; exceptionsCreated: number }>(
      '/admin/reconciliation/run',
    ),
  resolveReconciliation: (id: string, note: string) =>
    apiPost<ReconciliationRecordDto>(
      `/admin/reconciliation/${encodeURIComponent(id)}/resolve`,
      { note },
    ),

  // Coupons, Delivery Zones, Analytics, Audit
  listCoupons: () => apiGet<CouponDto[]>('/admin/coupons'),
  createCoupon: (data: CouponInput) => apiPost<CouponDto>('/admin/coupons', data),
  updateCoupon: (id: string, data: CouponInput) =>
    apiPut<CouponDto>(`/admin/coupons/${encodeURIComponent(id)}`, data),

  listDeliveryZones: () => apiGet<AdminDeliveryZoneDto[]>('/admin/delivery-zones'),
  createDeliveryZone: (data: DeliveryZoneInput) =>
    apiPost<AdminDeliveryZoneDto>('/admin/delivery-zones', data),
  updateDeliveryZone: (id: string, data: DeliveryZoneInput) =>
    apiPut<AdminDeliveryZoneDto>(
      `/admin/delivery-zones/${encodeURIComponent(id)}`,
      data,
    ),

  getAnalyticsSummary: (params: { from?: string; to?: string } = {}) =>
    apiGet<SalesSummaryDto>(`/admin/analytics/summary${buildQuery(params)}`),

  listAuditLogs: (
    params: { page?: number; pageSize?: number; entityType?: string } = {},
  ) => apiGet<Paged<AuditLogDto>>(`/admin/audit-logs${buildQuery(params)}`),
};
