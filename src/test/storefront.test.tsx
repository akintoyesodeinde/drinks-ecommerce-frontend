import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../contexts/ToastContext';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { AppRoutes } from '../App';
import { setAuthSession } from '../api/client';
import * as endpoints from '../api/endpoints';
import type {
  AuthResponse,
  CartDto,
  CategoryDto,
  CheckoutPreviewDto,
  OrderSummaryDto,
  Paged,
  PaymentStatusDto,
  ProductSummaryDto,
  SalesSummaryDto,
} from '../types/api';

function renderWithProviders(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <AppRoutes />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function loginAsRole(roles: string[]) {
  const auth: AuthResponse = {
    accessToken: 'mock-access-token',
    accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    refreshToken: 'mock-refresh-token',
    refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    user: {
      id: 'user-1',
      email: 'user@drinksecommerce.local',
      firstName: 'Ada',
      lastName: 'Okafor',
      phoneNumber: '+2348031234567',
      emailConfirmed: true,
      roles,
    },
  };
  setAuthSession(auth);
  vi.spyOn(endpoints.notificationsApi, 'getUnreadCount').mockResolvedValue({ count: 2 });
}

const sampleCategories: CategoryDto[] = [
  {
    id: 'cat-1',
    name: 'Soft Drinks',
    slug: 'soft-drinks',
    description: 'Carbonated drinks',
    imageUrl: null,
    productCount: 10,
  },
  {
    id: 'cat-2',
    name: 'Malt Drinks',
    slug: 'malt-drinks',
    description: 'Rich malt beverages',
    imageUrl: null,
    productCount: 5,
  },
];

const sampleProducts: ProductSummaryDto[] = [
  {
    id: 'prod-1',
    slug: 'coca-cola-50cl',
    name: 'Coca-Cola Original 50cl',
    brand: 'Coca-Cola',
    categoryId: 'cat-1',
    categoryName: 'Soft Drinks',
    categorySlug: 'soft-drinks',
    imageUrl: '/images/products/coke-50cl.svg',
    minPrice: 4800,
    maxPrice: 4800,
    inStock: true,
    isAlcoholic: false,
    isFeatured: true,
    variantCount: 1,
    defaultVariant: {
      id: 'var-coke-12',
      sku: 'COKE-50CL-12',
      name: 'Pack of 12 (50cl PET)',
      packType: 'Multipack',
      unitsPerPack: 12,
      unitVolumeMl: 500,
      price: 4800,
      compareAtPrice: 5200,
      stockStatus: 'InStock',
      availableQuantity: 40,
      isActive: true,
    },
  },
  {
    id: 'prod-2',
    slug: 'malta-guinness-33cl',
    name: 'Malta Guinness Can 33cl',
    brand: 'Guinness',
    categoryId: 'cat-2',
    categoryName: 'Malt Drinks',
    categorySlug: 'malt-drinks',
    imageUrl: '/images/products/malta-33cl.svg',
    minPrice: 9500,
    maxPrice: 9500,
    inStock: true,
    isAlcoholic: false,
    isFeatured: true,
    variantCount: 1,
    defaultVariant: {
      id: 'var-malta-24',
      sku: 'MALTA-33CL-24',
      name: 'Carton of 24 Cans',
      packType: 'Carton',
      unitsPerPack: 24,
      unitVolumeMl: 330,
      price: 9500,
      compareAtPrice: null,
      stockStatus: 'InStock',
      availableQuantity: 25,
      isActive: true,
    },
  },
];

describe('DrinksEcommerce Storefront & Admin Console Tests', () => {
  // 1. Product browsing & filtering
  it('renders product catalog and syncs filters (brand, inStockOnly, search) with API queries', async () => {
    const user = userEvent.setup();
    vi.spyOn(endpoints.catalogApi, 'getCategories').mockResolvedValue(sampleCategories);
    vi.spyOn(endpoints.catalogApi, 'getBrands').mockResolvedValue(['Coca-Cola', 'Guinness']);
    const getProductsSpy = vi
      .spyOn(endpoints.catalogApi, 'getProducts')
      .mockImplementation(async (params) => {
        const filtered = sampleProducts.filter((p) => {
          if (params?.brand && p.brand !== params.brand) return false;
          if (params?.search && !p.name.toLowerCase().includes(params.search.toLowerCase()))
            return false;
          return true;
        });
        const res: Paged<ProductSummaryDto> = {
          items: filtered,
          page: 1,
          pageSize: 12,
          totalCount: filtered.length,
          totalPages: 1,
        };
        return res;
      });

    renderWithProviders(['/products']);

    expect(await screen.findByText('Coca-Cola Original 50cl')).toBeInTheDocument();
    expect(screen.getByText('Malta Guinness Can 33cl')).toBeInTheDocument();

    // Filter by Brand "Guinness"
    const brandSelect = screen.getByLabelText(/Brand/i);
    await user.selectOptions(brandSelect, 'Guinness');

    await waitFor(() => {
      expect(getProductsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ brand: 'Guinness' }),
      );
    });
    expect(await screen.findByText('Malta Guinness Can 33cl')).toBeInTheDocument();
    expect(screen.queryByText('Coca-Cola Original 50cl')).not.toBeInTheDocument();
  });

  // 2. Cart updates & coupon calculation display
  it('displays cart items, updates quantities, and applies coupon discount calculation', async () => {
    const user = userEvent.setup();
    loginAsRole(['Customer']);

    const initialCart: CartDto = {
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Coca-Cola Original 50cl',
          productSlug: 'coca-cola-50cl',
          variantId: 'var-coke-12',
          variantName: 'Pack of 12 (50cl PET)',
          sku: 'COKE-50CL-12',
          imageUrl: null,
          unitPrice: 5000,
          quantity: 2,
          lineTotal: 10000,
          availableQuantity: 30,
          stockStatus: 'InStock',
          isAvailable: true,
        },
      ],
      itemCount: 2,
      subtotal: 10000,
      discount: 0,
      couponCode: null,
      total: 10000,
      warnings: [],
    };

    const updatedQtyCart: CartDto = {
      ...initialCart,
      items: [{ ...initialCart.items[0], quantity: 3, lineTotal: 15000 }],
      itemCount: 3,
      subtotal: 15000,
      total: 15000,
    };

    const couponAppliedCart: CartDto = {
      ...updatedQtyCart,
      discount: 1500,
      couponCode: 'WELCOME10',
      total: 13500,
    };

    vi.spyOn(endpoints.cartApi, 'get').mockResolvedValue(initialCart);
    vi.spyOn(endpoints.deliveryApi, 'getStates').mockResolvedValue(['Lagos', 'Abuja (FCT)']);
    const updateItemSpy = vi
      .spyOn(endpoints.cartApi, 'updateItem')
      .mockResolvedValue(updatedQtyCart);
    const applyCouponSpy = vi
      .spyOn(endpoints.cartApi, 'applyCoupon')
      .mockResolvedValue(couponAppliedCart);

    renderWithProviders(['/cart']);

    expect(await screen.findByText('Coca-Cola Original 50cl')).toBeInTheDocument();
    expect(screen.getByTestId('summary-subtotal')).toHaveTextContent('10,000.00');

    // Increase quantity
    const increaseBtn = screen.getByRole('button', {
      name: /Increase quantity for Coca-Cola Original 50cl/i,
    });
    await user.click(increaseBtn);

    await waitFor(() => {
      expect(updateItemSpy).toHaveBeenCalledWith('item-1', 3);
    });
    expect(await screen.findByTestId('summary-subtotal')).toHaveTextContent('15,000.00');

    // Apply coupon WELCOME10
    const couponInput = screen.getByLabelText(/Coupon code/i);
    await user.type(couponInput, 'WELCOME10');
    await user.click(screen.getByRole('button', { name: /^Apply$/i }));

    await waitFor(() => {
      expect(applyCouponSpy).toHaveBeenCalledWith('WELCOME10');
    });
    expect(await screen.findByTestId('summary-discount')).toHaveTextContent('1,500.00');
    expect(screen.getByTestId('summary-total')).toHaveTextContent('13,500.00');
  });

  // 3. Checkout validation (Nigerian phone validation, required address fields)
  it('validates Nigerian phone numbers and required address fields during checkout', async () => {
    const user = userEvent.setup();
    loginAsRole(['Customer']);

    vi.spyOn(endpoints.cartApi, 'get').mockResolvedValue({
      id: 'cart-1',
      items: [],
      itemCount: 1,
      subtotal: 9500,
      discount: 0,
      couponCode: null,
      total: 9500,
      warnings: [],
    });
    vi.spyOn(endpoints.addressApi, 'list').mockResolvedValue([]);
    vi.spyOn(endpoints.deliveryApi, 'getStates').mockResolvedValue(['Lagos', 'Abuja (FCT)']);
    vi.spyOn(endpoints.deliveryApi, 'getPickupLocations').mockResolvedValue([]);

    renderWithProviders(['/checkout']);

    // Proceed from Step 1 to Step 2
    const continueBtn = await screen.findByRole('button', {
      name: /Continue to Address \/ Pickup Details/i,
    });
    await user.click(continueBtn);

    // Clear phone and enter invalid phone number + leave city & street empty
    const phoneInput = screen.getByLabelText(/Nigerian Phone Number/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, '12345');

    const reviewBtn = screen.getByRole('button', { name: /Review Order/i });
    await user.click(reviewBtn);

    expect(
      await screen.findByText(/Enter a valid Nigerian phone number/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/City is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Street address is required/i)).toBeInTheDocument();
  });

  // 4. Delivery fee display (serviceable vs non-serviceable message)
  it('displays serviceable delivery fee and non-serviceable warning on checkout preview', async () => {
    const user = userEvent.setup();
    loginAsRole(['Customer']);

    vi.spyOn(endpoints.cartApi, 'get').mockResolvedValue({
      id: 'cart-1',
      items: [],
      itemCount: 1,
      subtotal: 9500,
      discount: 0,
      couponCode: null,
      total: 9500,
      warnings: [],
    });
    vi.spyOn(endpoints.addressApi, 'list').mockResolvedValue([
      {
        id: 'addr-1',
        label: 'Lagos Home',
        recipientName: 'Ada Okafor',
        phoneNumber: '+2348031234567',
        state: 'Lagos',
        city: 'Ikeja',
        street: '12 Allen Avenue',
        isDefault: true,
        isServiceable: true,
      },
    ]);
    vi.spyOn(endpoints.deliveryApi, 'getStates').mockResolvedValue(['Lagos']);
    vi.spyOn(endpoints.deliveryApi, 'getPickupLocations').mockResolvedValue([]);

    const serviceablePreview: CheckoutPreviewDto = {
      items: [
        {
          id: 'item-1',
          productId: 'prod-2',
          productName: 'Malta Guinness Can 33cl',
          productSlug: 'malta-guinness-33cl',
          variantId: 'var-malta-24',
          variantName: 'Carton of 24 Cans',
          sku: 'MALTA-33CL-24',
          imageUrl: null,
          unitPrice: 9500,
          quantity: 1,
          lineTotal: 9500,
          availableQuantity: 20,
          stockStatus: 'InStock',
          isAvailable: true,
        },
      ],
      subtotal: 9500,
      discount: 0,
      deliveryFee: 2000,
      tax: 0,
      total: 11500,
      currency: 'NGN',
      couponCode: null,
      serviceable: true,
      message: 'Standard Lagos Mainland delivery applies.',
      estimatedMinDays: 1,
      estimatedMaxDays: 2,
      warnings: [],
    };

    const previewSpy = vi
      .spyOn(endpoints.checkoutApi, 'preview')
      .mockResolvedValueOnce(serviceablePreview);

    renderWithProviders(['/checkout']);

    await user.click(
      await screen.findByRole('button', { name: /Continue to Address \/ Pickup Details/i }),
    );
    await user.click(screen.getByRole('button', { name: /Review Order/i }));

    const alertBox = await screen.findByTestId('checkout-serviceability-alert');
    expect(alertBox).toHaveTextContent('Location Serviceable');
    expect(alertBox).toHaveTextContent('Standard Lagos Mainland delivery applies.');
    expect(screen.getByTestId('summary-delivery-fee')).toHaveTextContent('2,000.00');

    // Now test non-serviceable response
    previewSpy.mockResolvedValueOnce({
      ...serviceablePreview,
      deliveryFee: 0,
      total: 9500,
      serviceable: false,
      message: 'Sorry, we do not currently deliver to this town.',
    });

    await user.click(screen.getByRole('button', { name: /Change Address \/ Method/i }));
    await user.click(screen.getByRole('button', { name: /Review Order/i }));

    const nonServiceableAlert = await screen.findByTestId('checkout-serviceability-alert');
    expect(nonServiceableAlert).toHaveTextContent('Delivery Location Not Serviceable');
    expect(nonServiceableAlert).toHaveTextContent(
      'Sorry, we do not currently deliver to this town.',
    );
    const payButton = screen.getByRole('button', { name: /with Paystack/i });
    expect(payButton).toBeDisabled();
  });

  // 5. Payment states: pending, failure, and backend-confirmed payment success
  it('renders pending, failure, and backend-confirmed success, and never marks order paid from URL alone when backend returns Failed', async () => {
    loginAsRole(['Customer']);
    vi.spyOn(endpoints.cartApi, 'get').mockResolvedValue({
      id: 'c',
      items: [],
      itemCount: 0,
      subtotal: 0,
      discount: 0,
      couponCode: null,
      total: 0,
      warnings: [],
    });

    const verifySpy = vi.spyOn(endpoints.paymentApi, 'verify');

    // Case A: Visiting /payment/success?reference=REF-FAIL&status=success when backend returns Failed
    const failedDto: PaymentStatusDto = {
      reference: 'REF-FAIL',
      orderId: 'ord-1',
      orderNumber: 'ORD-2026-0001',
      status: 'Failed',
      amount: 11500,
      currency: 'NGN',
      paidAt: null,
      channel: 'card',
      orderStatus: 'PendingPayment',
      message: 'Insufficient funds at issuing bank',
    };
    verifySpy.mockResolvedValueOnce(failedDto);

    const { unmount: unmountA } = renderWithProviders([
      '/payment/success?reference=REF-FAIL&status=success',
    ]);
    expect(await screen.findByTestId('payment-unconfirmed-view')).toBeInTheDocument();
    expect(screen.getByText(/Payment Not Confirmed/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payment-confirmed-success-view')).not.toBeInTheDocument();
    unmountA();

    // Case B: Backend confirms Successful
    const successDto: PaymentStatusDto = {
      reference: 'REF-OK',
      orderId: 'ord-2',
      orderNumber: 'ORD-2026-0002',
      status: 'Successful',
      amount: 14800,
      currency: 'NGN',
      paidAt: '2026-10-25T12:00:00Z',
      channel: 'card',
      orderStatus: 'Confirmed',
      message: 'Payment verified and confirmed.',
    };
    verifySpy.mockResolvedValueOnce(successDto);

    const { unmount: unmountB } = renderWithProviders(['/payment/success?reference=REF-OK']);
    expect(await screen.findByTestId('payment-confirmed-success-view')).toBeInTheDocument();
    expect(screen.getByText('ORD-2026-0002')).toBeInTheDocument();
    unmountB();

    // Case C: Pending payment page
    const pendingDto: PaymentStatusDto = {
      reference: 'REF-PEND',
      orderId: 'ord-3',
      orderNumber: 'ORD-2026-0003',
      status: 'Pending',
      amount: 9500,
      currency: 'NGN',
      paidAt: null,
      channel: 'bank_transfer',
      orderStatus: 'PendingPayment',
      message: 'Awaiting bank transfer confirmation.',
    };
    verifySpy.mockResolvedValue(pendingDto);

    const { unmount: unmountC } = renderWithProviders(['/payment/pending?reference=REF-PEND']);
    expect(await screen.findByTestId('payment-pending-view')).toBeInTheDocument();
    expect(await screen.findByText(/Awaiting bank transfer confirmation/i)).toBeInTheDocument();
    unmountC();
  });

  // 6. Customer order history rendering
  it('renders customer order history with order numbers, statuses, and formatted NGN totals', async () => {
    loginAsRole(['Customer']);
    vi.spyOn(endpoints.cartApi, 'get').mockResolvedValue({
      id: 'c',
      items: [],
      itemCount: 0,
      subtotal: 0,
      discount: 0,
      couponCode: null,
      total: 0,
      warnings: [],
    });

    const ordersPage: Paged<OrderSummaryDto> = {
      items: [
        {
          id: 'ord-101',
          orderNumber: 'ORD-2026-0101',
          status: 'OutForDelivery',
          paymentStatus: 'Successful',
          deliveryMethod: 'Delivery',
          total: 24500,
          currency: 'NGN',
          itemCount: 3,
          createdAt: '2026-10-25T10:15:00Z',
        },
        {
          id: 'ord-102',
          orderNumber: 'ORD-2026-0102',
          status: 'Delivered',
          paymentStatus: 'Successful',
          deliveryMethod: 'Pickup',
          total: 9500,
          currency: 'NGN',
          itemCount: 1,
          createdAt: '2026-10-24T09:00:00Z',
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 2,
      totalPages: 1,
    };

    vi.spyOn(endpoints.ordersApi, 'list').mockResolvedValue(ordersPage);

    renderWithProviders(['/orders']);

    const row1 = await screen.findByTestId('order-row-ORD-2026-0101');
    expect(row1).toHaveTextContent('ORD-2026-0101');
    expect(row1).toHaveTextContent('Out For Delivery');
    expect(row1).toHaveTextContent('24,500.00');

    const row2 = screen.getByTestId('order-row-ORD-2026-0102');
    expect(row2).toHaveTextContent('ORD-2026-0102');
    expect(row2).toHaveTextContent('Delivered');
    expect(row2).toHaveTextContent('9,500.00');
  });

  // 7. Administrative authorization-aware navigation
  it('enforces role-based admin access: blocks Customer, shows WarehouseStaff only allowed links, and shows Administrator all links', async () => {
    vi.spyOn(endpoints.cartApi, 'get').mockResolvedValue({
      id: 'c',
      items: [],
      itemCount: 0,
      subtotal: 0,
      discount: 0,
      couponCode: null,
      total: 0,
      warnings: [],
    });

    // A) Customer is blocked from /admin
    loginAsRole(['Customer']);
    const { unmount: unmountCustomer } = renderWithProviders(['/admin']);
    expect(await screen.findByText(/Access Denied/i)).toBeInTheDocument();
    unmountCustomer();

    // B) WarehouseStaff sees Inventory & Orders, but NOT Refunds or Reconciliation
    loginAsRole(['WarehouseStaff']);
    const { unmount: unmountWarehouse } = renderWithProviders(['/admin']);
    const sidebarWarehouse = await screen.findByLabelText(/Admin sidebar navigation/i);
    expect(within(sidebarWarehouse).getByText('Inventory')).toBeInTheDocument();
    expect(within(sidebarWarehouse).getByText('Orders')).toBeInTheDocument();
    expect(within(sidebarWarehouse).getByText('Products')).toBeInTheDocument();
    expect(within(sidebarWarehouse).queryByText('Refunds')).not.toBeInTheDocument();
    expect(within(sidebarWarehouse).queryByText('Reconciliation')).not.toBeInTheDocument();
    expect(within(sidebarWarehouse).queryByText('Coupons')).not.toBeInTheDocument();
    unmountWarehouse();

    // C) Administrator sees all admin navigation links and analytics dashboard
    loginAsRole(['Administrator']);
    const mockSummary: SalesSummaryDto = {
      from: '2026-09-25',
      to: '2026-10-25',
      grossRevenue: 450000,
      refundedAmount: 5000,
      netRevenue: 445000,
      paidOrders: 38,
      averageOrderValue: 11710.52,
      pendingPaymentOrders: 3,
      ordersByStatus: [{ status: 'Delivered', count: 30 }],
      topProducts: [],
      dailySales: [{ date: '2026-10-25', orders: 5, revenue: 65000 }],
      lowStockCount: 2,
      openReconciliationCount: 1,
    };
    vi.spyOn(endpoints.adminApi, 'getAnalyticsSummary').mockResolvedValue(mockSummary);

    const { unmount: unmountAdmin } = renderWithProviders(['/admin']);
    const sidebarAdmin = await screen.findByLabelText(/Admin sidebar navigation/i);
    expect(within(sidebarAdmin).getByText('Dashboard')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Products')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Categories')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Inventory')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Orders')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Deliveries')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Payments')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Refunds')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Reconciliation')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Coupons')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Delivery Zones')).toBeInTheDocument();
    expect(within(sidebarAdmin).getByText('Audit Logs')).toBeInTheDocument();

    expect(await screen.findByText('₦445,000.00')).toBeInTheDocument();
    unmountAdmin();
  });
});
