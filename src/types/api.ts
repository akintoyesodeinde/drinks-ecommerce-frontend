// Binding API Contract Types (v1) — Mirrors docs/API_REFERENCE.md

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
  correlationId?: string;
}

// 2. Enumerations
export type OrderStatus =
  | 'PendingPayment'
  | 'Confirmed'
  | 'Processing'
  | 'ReadyForDispatch'
  | 'OutForDelivery'
  | 'Delivered'
  | 'DeliveryFailed'
  | 'CancellationRequested'
  | 'Cancelled'
  | 'RefundPending'
  | 'PartiallyRefunded'
  | 'Refunded';

export type PaymentStatus =
  | 'Initialized'
  | 'Pending'
  | 'Successful'
  | 'Failed'
  | 'Abandoned'
  | 'Reversed'
  | 'RefundPending'
  | 'PartiallyRefunded'
  | 'Refunded';

export type DeliveryStatus =
  | 'NotScheduled'
  | 'AwaitingDispatch'
  | 'Assigned'
  | 'OutForDelivery'
  | 'Delivered'
  | 'FailedAttempt'
  | 'Returned'
  | 'Cancelled';

export type DeliveryMethod = 'Delivery' | 'Pickup';

export type PackType = 'Single' | 'Multipack' | 'Carton' | 'Crate' | 'Sachet' | 'Bundle';

export type StockStatus = 'InStock' | 'LowStock' | 'OutOfStock';

export type RefundStatus =
  | 'Requested'
  | 'Pending'
  | 'Processing'
  | 'Processed'
  | 'Failed'
  | 'NeedsAttention';

export type DiscountType = 'Percentage' | 'FixedAmount';

export type InventoryTransactionType =
  | 'InitialStock'
  | 'Restock'
  | 'Adjustment'
  | 'Damage'
  | 'Correction'
  | 'Reservation'
  | 'ReservationRelease'
  | 'Sale'
  | 'Return';

export type ReconciliationType =
  | 'PendingPaymentSucceededAtGateway'
  | 'AmountMismatch'
  | 'CurrencyMismatch'
  | 'GatewayPaymentWithoutOrder'
  | 'DuplicateReference'
  | 'AmbiguousInitialization'
  | 'RefundDiscrepancy'
  | 'ReversedTransaction'
  | 'RepeatedVerificationFailure'
  | 'PaidButStockUnavailable';

export type ReconciliationStatus = 'Open' | 'Resolved';

export type UserRole = 'Customer' | 'Administrator' | 'WarehouseStaff' | 'DeliveryStaff';

export type ProductSort = 'relevance' | 'name' | 'price_asc' | 'price_desc' | 'newest';

// 3. Authentication & Account
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  emailConfirmed: boolean;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: UserDto;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// 4. Addresses
export interface AddressInput {
  label?: string;
  recipientName: string;
  phoneNumber: string;
  state: string;
  city: string;
  street: string;
  landmark?: string;
  postalCode?: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export interface AddressDto extends AddressInput {
  id: string;
  isDefault: boolean;
  isServiceable: boolean;
}

// 5. Catalog
export interface VariantDto {
  id: string;
  sku: string;
  name: string;
  packType: PackType;
  unitsPerPack: number;
  unitVolumeMl: number | null;
  price: number;
  compareAtPrice: number | null;
  stockStatus: StockStatus;
  availableQuantity: number;
  isActive: boolean;
}

export interface ProductSummaryDto {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  imageUrl: string | null;
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  isAlcoholic: boolean;
  isFeatured: boolean;
  variantCount: number;
  defaultVariant: VariantDto | null;
}

export interface ProductImageDto {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

export interface ProductAttributeDto {
  name: string;
  value: string;
}

export interface ProductDetailDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  isAlcoholic: boolean;
  isFeatured: boolean;
  images: ProductImageDto[];
  attributes: ProductAttributeDto[];
  variants: VariantDto[];
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

export interface PromotionDto {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  linkUrl: string | null;
  startsAt: string;
  endsAt: string | null;
}

export interface ProductQueryParams {
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  featured?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

// 6. Cart
export interface CartItemDto {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  availableQuantity: number;
  stockStatus: StockStatus;
  isAvailable: boolean;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
  itemCount: number;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  total: number;
  warnings: string[];
}

export interface GuestCartItemSnapshot {
  variantId: string;
  quantity: number;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  availableQuantity: number;
  stockStatus: StockStatus;
}

// 7. Delivery
export interface DeliveryZoneDto {
  id: string;
  name: string;
  state: string;
  cities: string[];
  baseFee: number;
  freeDeliveryThreshold: number | null;
  estimatedMinDays: number;
  estimatedMaxDays: number;
}

export interface DeliveryEstimateDto {
  serviceable: boolean;
  zoneId: string | null;
  zoneName: string | null;
  fee: number;
  freeDeliveryApplied: boolean;
  freeDeliveryThreshold: number | null;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
  message: string;
}

export interface PickupLocationDto {
  id: string;
  name: string;
  address: string;
  state: string;
  city: string;
  openingHours: string;
  phoneNumber: string;
}

// 8. Checkout
export interface CheckoutRequest {
  deliveryMethod: DeliveryMethod;
  addressId?: string;
  address?: AddressInput;
  saveAddress?: boolean;
  pickupLocationId?: string;
  deliveryInstructions?: string;
  contactEmail?: string;
  client?: 'web' | 'mobile';
}

export interface CheckoutPreviewDto {
  items: CartItemDto[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  currency: 'NGN';
  couponCode: string | null;
  serviceable: boolean;
  message: string | null;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
  warnings: string[];
}

export interface CheckoutResultDto {
  orderId: string;
  orderNumber: string;
  total: number;
  currency: 'NGN';
  paymentReference: string;
  authorizationUrl: string | null;
  paymentStatus: PaymentStatus;
  reservationExpiresAt: string;
  message: string | null;
}

// 9. Payments
export interface PaymentStatusDto {
  reference: string;
  orderId: string;
  orderNumber: string;
  status: PaymentStatus;
  amount: number;
  currency: 'NGN';
  paidAt: string | null;
  channel: string | null;
  orderStatus: OrderStatus;
  message: string;
}

// 10. Orders & Tracking
export interface OrderSummaryDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  deliveryMethod: DeliveryMethod;
  total: number;
  currency: 'NGN';
  itemCount: number;
  createdAt: string;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderAddressDto {
  recipientName: string;
  phoneNumber: string;
  state: string;
  city: string;
  street: string;
  landmark: string | null;
  postalCode: string | null;
}

export interface StatusHistoryDto {
  status: string;
  note: string | null;
  actor: string | null;
  createdAt: string;
}

export interface OrderDetailDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  deliveryStatus: DeliveryStatus | null;
  deliveryMethod: DeliveryMethod;
  items: OrderItemDto[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  currency: 'NGN';
  couponCode: string | null;
  address: OrderAddressDto | null;
  pickupLocation: PickupLocationDto | null;
  deliveryInstructions: string | null;
  contactEmail: string;
  payment: {
    reference: string;
    status: PaymentStatus;
    amount: number;
    paidAt: string | null;
    channel: string | null;
  } | null;
  statusHistory: StatusHistoryDto[];
  canCancel: boolean;
  canPay: boolean;
  reservationExpiresAt: string | null;
  createdAt: string;
}

export interface TrackingStepDto {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
  occurredAt: string | null;
}

export interface TrackingDto {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus | null;
  deliveryMethod: DeliveryMethod;
  estimatedDeliveryFrom: string | null;
  estimatedDeliveryTo: string | null;
  rider: { name: string; phoneNumber: string } | null;
  steps: TrackingStepDto[];
  history: StatusHistoryDto[];
}

// 11. Notifications
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId: string | null;
  isRead: boolean;
  createdAt: string;
}

// 12. Administration
export interface VariantInput {
  sku: string;
  name: string;
  packType: PackType;
  unitsPerPack: number;
  unitVolumeMl?: number | null;
  price: number;
  compareAtPrice?: number | null;
  isActive: boolean;
  lowStockThreshold: number;
  initialStock?: number;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  brand: string;
  categoryId: string;
  isAlcoholic: boolean;
  isFeatured: boolean;
  isActive: boolean;
  attributes: { name: string; value: string }[];
  variants: VariantInput[];
}

export type UpdateProductRequest = Omit<CreateProductRequest, 'variants'>;

export interface AdminVariantDto extends VariantDto {
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
}

export interface AdminProductSummaryDto {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryName: string;
  imageUrl: string | null;
  isActive: boolean;
  isAlcoholic: boolean;
  isFeatured: boolean;
  variantCount: number;
  minPrice: number;
  maxPrice: number;
  totalAvailable: number;
  updatedAt: string;
}

export interface AdminProductDto extends Omit<ProductDetailDto, 'variants'> {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variants: AdminVariantDto[];
}

export interface AdminCategoryDto extends CategoryDto {
  isActive: boolean;
  sortOrder: number;
}

export interface CategoryInput {
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface InventoryItemDto {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  updatedAt: string;
}

export interface InventoryAdjustRequest {
  quantityChange: number;
  type: 'Restock' | 'Adjustment' | 'Damage' | 'Correction';
  reason: string;
}

export interface InventoryTransactionDto {
  id: string;
  type: InventoryTransactionType;
  quantityChange: number;
  onHandAfter: number;
  reservedAfter: number;
  reason: string | null;
  orderId: string | null;
  actor: string | null;
  createdAt: string;
}

export interface AdminOrderSummaryDto extends OrderSummaryDto {
  customerName: string;
  customerEmail: string;
}

export interface DeliveryDto {
  id: string;
  orderId: string;
  orderNumber: string;
  status: DeliveryStatus;
  orderStatus: OrderStatus;
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  state: string;
  city: string;
  deliveryInstructions: string | null;
  assignedToUserId: string | null;
  riderName: string | null;
  riderPhone: string | null;
  scheduledFor: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  receivedBy: string | null;
  attemptCount: number;
  lastException: string | null;
  updatedAt: string;
  history: StatusHistoryDto[];
}

export interface AdminOrderDetailDto extends OrderDetailDto {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  delivery: DeliveryDto | null;
  allowedActions: string[];
  refundedAmount: number;
  refundableAmount: number;
}

export interface DeliveryStaffDto {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface AssignDeliveryRequest {
  assignedToUserId?: string;
  riderName: string;
  riderPhone: string;
  scheduledFor?: string;
}

export type DeliveryExceptionReason =
  | 'CustomerUnavailable'
  | 'AddressIssue'
  | 'Damaged'
  | 'Refused'
  | 'Other';

export interface AdminPaymentDto {
  id: string;
  reference: string;
  orderId: string;
  orderNumber: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  channel: string | null;
  paidAt: string | null;
  createdAt: string;
  refundedAmount: number;
  customerEmail: string;
  attemptCount: number;
}

export interface PaymentAttemptDto {
  id: string;
  reference: string;
  status: string;
  authorizationUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface RefundDto {
  id: string;
  paymentId: string;
  paymentReference: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  providerRefundId: string | null;
  requestedBy: string | null;
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface AdminPaymentDetailDto extends AdminPaymentDto {
  gatewayResponse: string | null;
  providerTransactionId: string | null;
  attempts: PaymentAttemptDto[];
  refunds: RefundDto[];
  history: StatusHistoryDto[];
}

export interface CreateRefundRequest {
  orderId: string;
  amount: number;
  reason: string;
}

export interface ReconciliationRecordDto {
  id: string;
  type: ReconciliationType;
  status: ReconciliationStatus;
  paymentReference: string | null;
  orderId: string | null;
  orderNumber: string | null;
  expectedAmount: number | null;
  actualAmount: number | null;
  currency: string | null;
  description: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}

export interface CouponInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  isActive: boolean;
}

export interface CouponDto extends CouponInput {
  id: string;
  usedCount: number;
}

export interface FeeRuleDto {
  minOrderAmount: number;
  maxOrderAmount: number | null;
  fee: number;
}

export interface DeliveryZoneInput {
  name: string;
  state: string;
  cities: string[];
  baseFee: number;
  freeDeliveryThreshold?: number | null;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
  feeRules: FeeRuleDto[];
}

export interface AdminDeliveryZoneDto extends DeliveryZoneInput {
  id: string;
}

export interface SalesSummaryDto {
  from: string;
  to: string;
  grossRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  paidOrders: number;
  averageOrderValue: number;
  pendingPaymentOrders: number;
  ordersByStatus: { status: string; count: number }[];
  topProducts: {
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    revenue: number;
  }[];
  dailySales: { date: string; orders: number; revenue: number }[];
  lowStockCount: number;
  openReconciliationCount: number;
}

export interface AuditLogDto {
  id: string;
  actor: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}
