import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../../api/endpoints';
import { ProductCard } from '../../components/common/ProductCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';

export const HomePage: React.FC = () => {
  const {
    data: featuredData,
    isLoading: loadingFeatured,
    error: featuredError,
    refetch: refetchFeatured,
  } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => catalogApi.getProducts({ featured: true, pageSize: 8 }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: () => catalogApi.getActivePromotions(),
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-dark text-white py-5 mb-4 border-bottom">
        <div className="container py-3">
          <div className="row align-items-center gy-4">
            <div className="col-lg-7">
              <span className="badge text-bg-success mb-2 px-3 py-2">
                Nationwide Drinks Delivery Across Nigeria
              </span>
              <h1 className="display-5 fw-bold mb-3">
                Stock Up on Cartons, Crates & Refreshing Beverages
              </h1>
              <p className="lead text-light opacity-75 mb-4">
                Order soft drinks, juices, malt, water, and energy drinks at wholesale and retail
                prices in Naira (₦). Pay securely with Paystack and track your delivery live.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/products" className="btn btn-success btn-lg px-4 fw-semibold">
                  Shop All Drinks
                </Link>
                <Link to="/products?inStockOnly=true" className="btn btn-outline-light btn-lg px-4">
                  In-Stock Deals
                </Link>
              </div>
            </div>
            <div className="col-lg-5 text-center">
              <div className="p-4 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-25">
                <i className="bi bi-truck display-2 text-success d-block mb-2" aria-hidden="true" />
                <h2 className="h4 fw-bold">Fast Lagos & Interstate Fulfilment</h2>
                <p className="small text-light opacity-75 mb-0">
                  Use code <strong className="text-warning">WELCOME10</strong> for 10% off orders
                  above ₦5,000!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container pb-5">
        {/* Active Promotions */}
        {promotions.length > 0 && (
          <section className="mb-5" aria-label="Active promotions">
            <div className="row g-3">
              {promotions.map((promo) => (
                <div key={promo.id} className="col-md-6">
                  <div className="card border-0 shadow-sm bg-warning bg-opacity-10 h-100">
                    <div className="card-body d-flex flex-column justify-content-between">
                      <div>
                        <span className="badge text-bg-warning mb-2">Special Offer</span>
                        <h3 className="h5 fw-bold">{promo.title}</h3>
                        <p className="text-muted small mb-3">{promo.description}</p>
                      </div>
                      {promo.linkUrl && (
                        <div>
                          <Link to={promo.linkUrl} className="btn btn-sm btn-dark">
                            Explore Offer
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <section className="mb-5">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h4 fw-bold mb-0">Shop by Category</h2>
              <Link to="/products" className="text-success text-decoration-none fw-semibold small">
                View All Categories →
              </Link>
            </div>
            <div className="row row-cols-2 row-cols-md-3 row-cols-lg-6 g-3">
              {categories.map((cat) => (
                <div key={cat.id} className="col">
                  <Link
                    to={`/categories/${cat.slug}`}
                    className="card h-100 text-decoration-none text-dark shadow-sm border-0 text-center p-3 hover-shadow"
                  >
                    <i
                      className="bi bi-cup-straw fs-2 text-success mb-2 d-block"
                      aria-hidden="true"
                    />
                    <div className="fw-bold small">{cat.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {cat.productCount} products
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        <section>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h4 fw-bold mb-0">Featured Drinks</h2>
            <Link to="/products" className="btn btn-outline-success btn-sm">
              Browse Full Catalog
            </Link>
          </div>

          {loadingFeatured ? (
            <LoadingSpinner label="Loading featured drinks..." />
          ) : featuredError ? (
            <ErrorState error={featuredError} onRetry={() => void refetchFeatured()} />
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
              {(featuredData?.items ?? []).map((product) => (
                <div key={product.id} className="col">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
