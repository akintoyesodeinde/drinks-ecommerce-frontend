import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-dark text-light py-4 mt-auto border-top">
      <div className="container">
        <div className="row gy-3">
          <div className="col-md-5">
            <h5 className="fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-cup-straw text-success" aria-hidden="true" />
              DrinksEcommerce Nigeria
            </h5>
            <p className="text-secondary small mb-0">
              Fast, reliable wholesale and retail drinks delivery across Lagos, Abuja, Port Harcourt,
              and all 36 states + FCT. Authentic cartons, crates, multipacks, and single bottles.
            </p>
          </div>
          <div className="col-6 col-md-3">
            <h6 className="fw-bold text-uppercase small text-secondary">Storefront</h6>
            <ul className="list-unstyled small mb-0">
              <li className="mb-1">
                <Link to="/products" className="text-light text-decoration-none">
                  All Drinks
                </Link>
              </li>
              <li className="mb-1">
                <Link to="/cart" className="text-light text-decoration-none">
                  Shopping Cart
                </Link>
              </li>
              <li className="mb-1">
                <Link to="/orders" className="text-light text-decoration-none">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-6 col-md-4">
            <h6 className="fw-bold text-uppercase small text-secondary">Secure Payments & Support</h6>
            <p className="small text-secondary mb-1">
              All transactions are priced in Nigerian Naira (₦) and processed securely via Paystack.
            </p>
            <div className="small text-secondary">
              Timezone: Africa/Lagos (WAT)
            </div>
          </div>
        </div>
        <hr className="border-secondary my-3" />
        <div className="d-flex flex-wrap justify-content-between align-items-center small text-secondary">
          <span>© {new Date().getFullYear()} DrinksEcommerce Nigeria. All rights reserved.</span>
          <span>Drink Responsibly.</span>
        </div>
      </div>
    </footer>
  );
};
