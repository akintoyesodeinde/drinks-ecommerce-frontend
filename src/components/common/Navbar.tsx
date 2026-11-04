import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { notificationsApi } from '../../api/endpoints';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isStaff, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [navExpanded, setNavExpanded] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/search?search=${encodeURIComponent(q)}`);
      setNavExpanded(false);
    } else {
      navigate('/products');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/">
          <i className="bi bi-cup-straw text-success fs-4" aria-hidden="true" />
          <span>DrinksEcommerce</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-controls="main-navbar"
          aria-expanded={navExpanded}
          aria-label="Toggle navigation"
          onClick={() => setNavExpanded((prev) => !prev)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse ${navExpanded ? 'show' : ''}`} id="main-navbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink className="nav-link" to="/" end onClick={() => setNavExpanded(false)}>
                Home
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/products" onClick={() => setNavExpanded(false)}>
                Catalog
              </NavLink>
            </li>
            {isAuthenticated && (
              <li className="nav-item">
                <NavLink className="nav-link" to="/orders" onClick={() => setNavExpanded(false)}>
                  My Orders
                </NavLink>
              </li>
            )}
            {isStaff && (
              <li className="nav-item">
                <NavLink
                  className="nav-link text-warning fw-semibold"
                  to="/admin"
                  onClick={() => setNavExpanded(false)}
                >
                  <i className="bi bi-shield-lock me-1" aria-hidden="true" />
                  Admin Console
                </NavLink>
              </li>
            )}
          </ul>

          <form className="d-flex me-lg-3 my-2 my-lg-0" role="search" onSubmit={handleSearchSubmit}>
            <div className="input-group input-group-sm">
              <input
                type="search"
                className="form-control"
                placeholder="Search drinks, cartons..."
                aria-label="Search drinks"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-success" type="submit" aria-label="Submit search">
                <i className="bi bi-search" aria-hidden="true" />
              </button>
            </div>
          </form>

          <div className="d-flex align-items-center gap-2">
            {isAuthenticated && (
              <Link
                to="/notifications"
                className="btn btn-outline-light btn-sm position-relative"
                aria-label="Notifications"
                onClick={() => setNavExpanded(false)}
              >
                <i className="bi bi-bell" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    data-testid="unread-notifications-badge"
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            <Link
              to="/cart"
              className="btn btn-outline-success btn-sm position-relative"
              aria-label="Shopping cart"
              onClick={() => setNavExpanded(false)}
            >
              <i className="bi bi-cart3 me-1" aria-hidden="true" />
              Cart
              {cart.itemCount > 0 && (
                <span
                  className="badge text-bg-success ms-1"
                  data-testid="navbar-cart-count"
                >
                  {cart.itemCount}
                </span>
              )}
            </Link>

            {isAuthenticated && user ? (
              <div className="d-flex align-items-center gap-2">
                <Link
                  to="/account/profile"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => setNavExpanded(false)}
                >
                  <i className="bi bi-person-circle me-1" aria-hidden="true" />
                  {user.firstName}
                </Link>
                <Link
                  to="/account/addresses"
                  className="btn btn-outline-secondary btn-sm text-light"
                  onClick={() => setNavExpanded(false)}
                >
                  Addresses
                </Link>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link
                  to="/login"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => setNavExpanded(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn btn-success btn-sm"
                  onClick={() => setNavExpanded(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
