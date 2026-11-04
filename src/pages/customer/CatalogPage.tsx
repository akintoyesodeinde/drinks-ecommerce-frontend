import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../../api/endpoints';
import { ProductCard } from '../../components/common/ProductCard';
import { ProductFilters, type FilterState } from '../../components/common/ProductFilters';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import type { ProductSort } from '../../types/api';

export const CatalogPage: React.FC<{ mode?: 'catalog' | 'category' | 'search' }> = ({
  mode = 'catalog',
}) => {
  const { slug: routeCategorySlug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const categorySlug =
    mode === 'category' ? routeCategorySlug || '' : searchParams.get('categorySlug') || '';
  const brand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStockOnly = searchParams.get('inStockOnly') === 'true';
  const sort = (searchParams.get('sort') as ProductSort) || 'relevance';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => catalogApi.getBrands(),
  });

  const { data: categoryDetail } = useQuery({
    queryKey: ['category', routeCategorySlug],
    queryFn: () => catalogApi.getCategory(routeCategorySlug!),
    enabled: mode === 'category' && Boolean(routeCategorySlug),
  });

  const queryParams = {
    search: search || undefined,
    categorySlug: categorySlug || undefined,
    brand: brand || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    inStockOnly: inStockOnly ? true : undefined,
    sort,
    page,
    pageSize: 12,
  };

  const {
    data: productsPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => catalogApi.getProducts(queryParams),
  });

  const updateFilters = (updated: Partial<FilterState>) => {
    const next = new URLSearchParams(searchParams);
    const merged: FilterState = {
      search,
      categorySlug,
      brand,
      minPrice,
      maxPrice,
      inStockOnly,
      sort,
      ...updated,
    };

    const setOrDelete = (k: string, v: string) => {
      if (v) next.set(k, v);
      else next.delete(k);
    };

    setOrDelete('search', merged.search);
    if (mode !== 'category') {
      setOrDelete('categorySlug', merged.categorySlug);
    }
    setOrDelete('brand', merged.brand);
    setOrDelete('minPrice', merged.minPrice);
    setOrDelete('maxPrice', merged.maxPrice);
    setOrDelete('inStockOnly', merged.inStockOnly ? 'true' : '');
    setOrDelete('sort', merged.sort === 'relevance' ? '' : merged.sort);
    next.delete('page');
    setSearchParams(next);
  };

  const handleReset = () => {
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  };

  const pageTitle =
    mode === 'category'
      ? categoryDetail?.name || 'Category Drinks'
      : mode === 'search'
        ? search
          ? `Search Results for "${search}"`
          : 'Search Drinks'
        : 'All Drinks & Beverages';

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1">{pageTitle}</h1>
        {mode === 'category' && categoryDetail?.description && (
          <p className="text-muted mb-0">{categoryDetail.description}</p>
        )}
      </div>

      <div className="row g-4">
        <div className="col-lg-3">
          <ProductFilters
            filters={{
              search,
              categorySlug,
              brand,
              minPrice,
              maxPrice,
              inStockOnly,
              sort,
            }}
            categories={categories}
            brands={brands}
            hideCategoryFilter={mode === 'category'}
            onChange={updateFilters}
            onReset={handleReset}
          />
        </div>

        <div className="col-lg-9">
          {isLoading ? (
            <LoadingSpinner label="Loading drinks catalog..." />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : !productsPage || productsPage.items.length === 0 ? (
            <EmptyState
              icon="bi-search"
              title="No matching drinks found"
              description="Try clearing some filters or searching for another brand or pack size."
              action={
                <button type="button" className="btn btn-outline-success" onClick={handleReset}>
                  Clear Filters
                </button>
              }
            />
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted small">
                  Showing <strong>{productsPage.items.length}</strong> of{' '}
                  <strong>{productsPage.totalCount}</strong> drinks
                </span>
              </div>
              <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
                {productsPage.items.map((product) => (
                  <div key={product.id} className="col">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
              <Pagination
                page={productsPage.page}
                totalPages={productsPage.totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
