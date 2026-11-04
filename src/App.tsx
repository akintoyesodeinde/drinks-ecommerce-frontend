import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ProtectedRoute, RoleRoute } from './components/common/ProtectedRoute';

// Customer Pages
import { HomePage } from './pages/customer/HomePage';
import { CatalogPage } from './pages/customer/CatalogPage';
import { ProductDetailPage } from './pages/customer/ProductDetailPage';
import { CartPage } from './pages/customer/CartPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import {
  PaymentFailurePage,
  PaymentPendingPage,
  PaymentSuccessPage,
  PaymentVerifyPage,
} from './pages/customer/PaymentPages';
import {
  ConfirmEmailPage,
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from './pages/customer/AuthPages';
import { AddressesPage, ProfilePage } from './pages/customer/AccountPages';
import {
  OrderDetailPage,
  OrderHistoryPage,
  OrderTrackingPage,
} from './pages/customer/OrdersPages';
import { NotificationsPage } from './pages/customer/NotificationsPage';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage';
import {
  AdminOrderDetailPage,
  AdminOrdersListPage,
} from './pages/admin/AdminOrdersPage';
import { AdminDeliveriesPage } from './pages/admin/AdminDeliveriesPage';
import {
  AdminPaymentsPage,
  AdminReconciliationPage,
  AdminRefundsPage,
} from './pages/admin/AdminPaymentsPages';
import {
  AdminAuditLogsPage,
  AdminCouponsPage,
  AdminDeliveryZonesPage,
} from './pages/admin/AdminConfigAuditPages';

export const AppRoutes: React.FC = () => {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <div className="flex-grow-1">
        <Routes>
          {/* Public Storefront Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<CatalogPage mode="catalog" />} />
          <Route path="/categories/:slug" element={<CatalogPage mode="category" />} />
          <Route path="/search" element={<CatalogPage mode="search" />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />

          {/* Protected Customer Routes */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/verify"
            element={
              <ProtectedRoute>
                <PaymentVerifyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/pending"
            element={
              <ProtectedRoute>
                <PaymentPendingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/failure"
            element={
              <ProtectedRoute>
                <PaymentFailurePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/addresses"
            element={
              <ProtectedRoute>
                <AddressesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id/tracking"
            element={
              <ProtectedRoute>
                <OrderTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Role-Aware Admin Routes */}
          <Route
            path="/admin"
            element={
              <RoleRoute
                allowedRoles={['Administrator', 'WarehouseStaff', 'DeliveryStaff']}
              >
                <AdminLayout />
              </RoleRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route
              path="products"
              element={
                <RoleRoute allowedRoles={['Administrator', 'WarehouseStaff']}>
                  <AdminProductsPage />
                </RoleRoute>
              }
            />
            <Route
              path="categories"
              element={
                <RoleRoute allowedRoles={['Administrator']}>
                  <AdminCategoriesPage />
                </RoleRoute>
              }
            />
            <Route
              path="inventory"
              element={
                <RoleRoute allowedRoles={['Administrator', 'WarehouseStaff']}>
                  <AdminInventoryPage />
                </RoleRoute>
              }
            />
            <Route
              path="orders"
              element={
                <RoleRoute allowedRoles={['Administrator', 'WarehouseStaff']}>
                  <AdminOrdersListPage />
                </RoleRoute>
              }
            />
            <Route
              path="orders/:id"
              element={
                <RoleRoute allowedRoles={['Administrator', 'WarehouseStaff']}>
                  <AdminOrderDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="deliveries"
              element={
                <RoleRoute allowedRoles={['Administrator', 'DeliveryStaff']}>
                  <AdminDeliveriesPage />
                </RoleRoute>
              }
            />
            <Route
              path="payments"
              element={
                <RoleRoute allowedRoles={['Administrator']}>
                  <AdminPaymentsPage />
                </RoleRoute>
              }
            />
            <Route
              path="refunds"
              element={
                <RoleRoute allowedRoles={['Administrator']}>
                  <AdminRefundsPage />
                </RoleRoute>
              }
            />
            <Route
              path="reconciliation"
              element={
                <RoleRoute allowedRoles={['Administrator']}>
                  <AdminReconciliationPage />
                </RoleRoute>
              }
            />
            <Route
              path="coupons"
              element={
                <RoleRoute allowedRoles={['Administrator']}>
                  <AdminCouponsPage />
                </RoleRoute>
              }
            />
            <Route
              path="delivery-zones"
              element={
                <RoleRoute allowedRoles={['Administrator']}>
                  <AdminDeliveryZonesPage />
                </RoleRoute>
              }
            />
            <Route
              path="audit-logs"
              element={
                <RoleRoute allowedRoles={['Administrator']}>
                  <AdminAuditLogsPage />
                </RoleRoute>
              }
            />
          </Route>
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={defaultQueryClient}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
