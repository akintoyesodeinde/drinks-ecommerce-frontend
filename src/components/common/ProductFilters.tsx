import React from 'react';
import type { CategoryDto, ProductSort } from '../../types/api';

export interface FilterState {
  search: string;
  categorySlug: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  sort: ProductSort;
}

interface ProductFiltersProps {
  filters: FilterState;
  categories: CategoryDto[];
  brands: string[];
  hideCategoryFilter?: boolean;
  onChange: (updated: Partial<FilterState>) => void;
  onReset: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  categories,
  brands,
  hideCategoryFilter = false,
  onChange,
  onReset,
}) => {
  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h6 fw-bold mb-0">
            <i className="bi bi-funnel me-1" aria-hidden="true" />
            Filter Drinks
          </h2>
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none p-0"
            onClick={onReset}
          >
            Reset All
          </button>
        </div>

        <div className="mb-3">
          <label htmlFor="filter-search" className="form-label small fw-semibold">
            Search Keyword
          </label>
          <input
            id="filter-search"
            type="search"
            className="form-control form-control-sm"
            placeholder="Search brand, drink, pack..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </div>

        {!hideCategoryFilter && (
          <div className="mb-3">
            <label htmlFor="filter-category" className="form-label small fw-semibold">
              Category
            </label>
            <select
              id="filter-category"
              className="form-select form-select-sm"
              value={filters.categorySlug}
              onChange={(e) => onChange({ categorySlug: e.target.value })}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name} ({cat.productCount})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-3">
          <label htmlFor="filter-brand" className="form-label small fw-semibold">
            Brand
          </label>
          <select
            id="filter-brand"
            className="form-select form-select-sm"
            value={filters.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-6">
            <label htmlFor="filter-min-price" className="form-label small fw-semibold">
              Min Price (₦)
            </label>
            <input
              id="filter-min-price"
              type="number"
              min={0}
              className="form-control form-control-sm"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
            />
          </div>
          <div className="col-6">
            <label htmlFor="filter-max-price" className="form-label small fw-semibold">
              Max Price (₦)
            </label>
            <input
              id="filter-max-price"
              type="number"
              min={0}
              className="form-control form-control-sm"
              placeholder="Any"
              value={filters.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
            />
          </div>
        </div>

        <div className="form-check form-switch mb-3">
          <input
            id="filter-in-stock"
            type="checkbox"
            className="form-check-input"
            checked={filters.inStockOnly}
            onChange={(e) => onChange({ inStockOnly: e.target.checked })}
          />
          <label htmlFor="filter-in-stock" className="form-check-label small fw-semibold">
            In-Stock Only
          </label>
        </div>

        <div>
          <label htmlFor="filter-sort" className="form-label small fw-semibold">
            Sort By
          </label>
          <select
            id="filter-sort"
            className="form-select form-select-sm"
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as ProductSort })}
          >
            <option value="relevance">Relevance</option>
            <option value="name">Name (A–Z)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest Arrivals</option>
          </select>
        </div>
      </div>
    </div>
  );
};
