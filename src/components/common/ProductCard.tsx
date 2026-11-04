import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Price } from './Price';
import { StatusBadge } from './StatusBadge';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import type { ProductSummaryDto } from '../../types/api';

interface ProductCardProps {
  product: ProductSummaryDto;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);

  const defaultVariant = product.defaultVariant;
  const canQuickAdd = Boolean(
    product.inStock &&
      defaultVariant &&
      defaultVariant.isActive &&
      defaultVariant.stockStatus !== 'OutOfStock' &&
      defaultVariant.availableQuantity > 0,
  );

  const handleQuickAdd = async () => {
    if (!defaultVariant) return;
    setAdding(true);
    try {
      await addItem({
        variantId: defaultVariant.id,
        quantity: 1,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        variantName: defaultVariant.name,
        sku: defaultVariant.sku,
        imageUrl: product.imageUrl,
        unitPrice: defaultVariant.price,
        availableQuantity: defaultVariant.availableQuantity,
        stockStatus: defaultVariant.stockStatus,
      });
      showToast(`Added ${product.name} (${defaultVariant.name}) to cart`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add to cart', 'danger');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card h-100 shadow-sm border-0 product-card">
      <Link
        to={`/products/${product.slug}`}
        className="text-decoration-none text-dark position-relative d-block bg-light rounded-top overflow-hidden"
        style={{ height: 190 }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-100 h-100 object-fit-contain p-3"
            loading="lazy"
          />
        ) : (
          <div className="w-100 h-100 d-flex align-items-center justify-content-center text-secondary">
            <i className="bi bi-cup-straw display-4" aria-hidden="true" />
          </div>
        )}
        <div className="position-absolute top-0 start-0 p-2 d-flex gap-1 flex-wrap">
          {product.isFeatured && <span className="badge text-bg-warning">Featured</span>}
          {!product.inStock && <StatusBadge status="OutOfStock" />}
        </div>
      </Link>

      <div className="card-body d-flex flex-column">
        <div className="small text-muted mb-1">
          {product.brand} · {product.categoryName}
        </div>
        <h3 className="h6 card-title fw-bold mb-1">
          <Link to={`/products/${product.slug}`} className="text-decoration-none text-dark">
            {product.name}
          </Link>
        </h3>
        {defaultVariant && (
          <div className="small text-secondary mb-2">
            {defaultVariant.name} ({defaultVariant.packType})
          </div>
        )}

        <div className="mt-auto pt-2 d-flex align-items-center justify-content-between gap-2">
          <div>
            <Price
              amount={defaultVariant ? defaultVariant.price : product.minPrice}
              compareAtAmount={defaultVariant?.compareAtPrice}
            />
            {product.variantCount > 1 && (
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                {product.variantCount} pack options
              </div>
            )}
          </div>
          {canQuickAdd ? (
            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={adding}
              onClick={handleQuickAdd}
              aria-label={`Add ${product.name} to cart`}
            >
              <i className="bi bi-cart-plus me-1" aria-hidden="true" />
              {adding ? '...' : 'Add'}
            </button>
          ) : (
            <Link
              to={`/products/${product.slug}`}
              className="btn btn-sm btn-outline-secondary"
            >
              View
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
