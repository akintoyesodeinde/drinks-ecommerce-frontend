import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/api';

interface AdminNavItem {
  to: string;
  label: string;
  icon: string;
  roles: UserRole[];
  end?: boolean;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    to: '/admin',
    label: 'Dashboard',
    icon: 'bi-speedometer2',
    roles: ['Administrator', 'WarehouseStaff', 'DeliveryStaff'],
    end: true,
  },
  {
    to: '/admin/products',
    label: 'Products',
    icon: 'bi-box-seam',
    roles: ['Administrator', 'WarehouseStaff'],
  },
  {
    to: '/admin/categories',
    label: 'Categories',
    icon: 'bi-tags',
    roles: ['Administrator'],
  },
  {
    to: '/admin/inventory',
    label: 'Inventory',
    icon: 'bi-clipboard-data',
    roles: ['Administrator', 'WarehouseStaff'],
  },
  {
    to: '/admin/orders',
    label: 'Orders',
    icon: 'bi-receipt',
    roles: ['Administrator', 'WarehouseStaff'],
  },
  {
    to: '/admin/deliveries',
    label: 'Deliveries',
    icon: 'bi-truck',
    roles: ['Administrator', 'DeliveryStaff'],
  },
  {
    to: '/admin/payments',
    label: 'Payments',
    icon: 'bi-credit-card-2-front',
    roles: ['Administrator'],
  },
  {
    to: '/admin/refunds',
    label: 'Refunds',
    icon: 'bi-arrow-counterclockwise',
    roles: ['Administrator'],
  },
  {
    to: '/admin/reconciliation',
    label: 'Reconciliation',
    icon: 'bi-shield-exclamation',
    roles: ['Administrator'],
  },
  {
    to: '/admin/coupons',
    label: 'Coupons',
    icon: 'bi-ticket-perforated',
    roles: ['Administrator'],
  },
  {
    to: '/admin/delivery-zones',
    label: 'Delivery Zones',
    icon: 'bi-geo-alt',
    roles: ['Administrator'],
  },
  {
    to: '/admin/audit-logs',
    label: 'Audit Logs',
    icon: 'bi-journal-text',
    roles: ['Administrator'],
  },
];

export const AdminLayout: React.FC = () => {
  const { user, hasRole } = useAuth();

  const visibleItems = ADMIN_NAV_ITEMS.filter((item) => hasRole(...item.roles));

  return (
    <div className="container-fluid py-3">
      <div className="row g-3">
        <aside className="col-md-3 col-lg-2" aria-label="Admin sidebar navigation">
          <div className="card shadow-sm border-0 sticky-top" style={{ top: 72 }}>
            <div className="card-header bg-dark text-white">
              <div className="fw-bold small text-uppercase">Admin Console</div>
              <div className="small text-warning">
                {user?.roles.join(', ')}
              </div>
            </div>
            <div className="list-group list-group-flush">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `list-group-item list-group-item-action d-flex align-items-center gap-2 small fw-medium ${
                      isActive ? 'active bg-success border-success text-white' : ''
                    }`
                  }
                >
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <Link
                to="/"
                className="list-group-item list-group-item-action d-flex align-items-center gap-2 small text-secondary"
              >
                <i className="bi bi-arrow-left" aria-hidden="true" />
                <span>Back to Storefront</span>
              </Link>
            </div>
          </div>
        </aside>

        <main className="col-md-9 col-lg-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
