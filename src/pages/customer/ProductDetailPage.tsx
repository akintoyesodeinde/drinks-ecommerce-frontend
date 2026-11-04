import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../../api/endpoints';
import { Price } from '../../components/common/Price';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import type { VariantDto } from '../../types/api';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: product,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => catalogApi.getProduct(slug!),
    enabled: Boolean(slug),
  });

  if (isLoading) return <LoadingSpinner fullPage label="Loading drink details..." />;
  if (error || !product) {
    return (
      <div className="container py-4">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const activeVariants = product.variants.filter((v) => v.isActive);
  const selectedVariant: VariantDto | undefined =
    activeVariants.find((v) => v.id === selectedVariantId) ||
    activeVariants[0] ||
    product.variants[0];

  const mainImage = product.images[selectedImageIdx] || product.images[0];
  const maxQty = selectedVariant ? Math.min(99, Math.max(1, selectedVariant.availableQuantity)) : 1;
  const canAdd =
    Boolean(selectedVariant) &&
    selectedVariant.isActive &&
    selectedVariant.stockStatus !== 'OutOfStock' &&
    selectedVariant.availableQuantity > 0;

  const handleVariantChange = (v: VariantDto) => {
    setSelectedVariantId(v.id);
    setQuantity(1);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setSubmitting(true);
    try {
      await addItem({
        variantId: selectedVariant.id,
        quantity,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        variantName: selectedVariant.name,
        sku: selectedVariant.sku,
        imageUrl: mainImage?.url || null,
        unitPrice: selectedVariant.price,
        availableQuantity: selectedVariant.availableQuantity,
        stockStatus: selectedVariant.stockStatus,
      });
      showToast(`Added ${quantity} × ${product.name} (${selectedVariant.name}) to cart`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add to cart', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/">Home</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={`/categories/${product.categorySlug}`}>{product.categoryName}</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="row g-4">
        {/* Image Gallery */}
        <div className="col-md-5">
          <div
            className="bg-light rounded border d-flex align-items-center justify-content-center p-4 mb-3"
            style={{ height: 360 }}
          >
            {mainImage ? (
              <img
                src={mainImage.url}
                alt={mainImage.altText || product.name}
                className="w-100 h-100 object-fit-contain"
              />
            ) : (
              <i className="bi bi-cup-straw display-1 text-secondary" aria-hidden="true" />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="d-flex gap-2 overflow-auto">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  className={`btn p-1 border rounded bg-light ${
                    idx === selectedImageIdx ? 'border-success border-2' : ''
                  }`}
                  style={{ width: 68, height: 68 }}
                  onClick={() => setSelectedImageIdx(idx)}
                >
                  <img
                    src={img.url}
                    alt={img.altText || product.name}
                    className="w-100 h-100 object-fit-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info & Pack Selector */}
        <div className="col-md-7">
          <div className="mb-2 d-flex align-items-center gap-2">
            <span className="badge text-bg-light border text-dark">{product.brand}</span>
            <span className="badge text-bg-light border text-secondary">{product.categoryName}</span>
            {product.isFeatured && <span className="badge text-bg-warning">Featured</span>}
          </div>

          <h1 className="h3 fw-bold mb-2">{product.name}</h1>
          <p className="text-muted mb-4">{product.description}</p>

          {selectedVariant && (
            <div className="mb-4 p-3 bg-light rounded border">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Price
                  amount={selectedVariant.price}
                  compareAtAmount={selectedVariant.compareAtPrice}
                  size="lg"
                />
                <StatusBadge status={selectedVariant.stockStatus} />
              </div>
              <div className="small text-secondary">
                SKU: <code>{selectedVariant.sku}</code> · Pack Type:{' '}
                <strong>{selectedVariant.packType}</strong> · Units per pack:{' '}
                <strong>{selectedVariant.unitsPerPack}</strong>
                {selectedVariant.unitVolumeMl ? ` · ${selectedVariant.unitVolumeMl}ml each` : ''}
                {' · '}Available: <strong>{selectedVariant.availableQuantity}</strong>
              </div>
            </div>
          )}

          {/* Variant / Pack Selector */}
          <div className="mb-4">
            <label className="form-label fw-semibold d-block">Select Pack Option</label>
            <div className="row g-2">
              {activeVariants.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;
                return (
                  <div key={variant.id} className="col-sm-6">
                    <button
                      type="button"
                      className={`btn w-100 text-start p-3 border ${
                        isSelected
                          ? 'border-success bg-success bg-opacity-10 fw-semibold'
                          : 'bg-white'
                      }`}
                      onClick={() => handleVariantChange(variant)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{variant.name}</span>
                        <StatusBadge status={variant.stockStatus} />
                      </div>
                      <div className="small text-muted mt-1">
                        {variant.packType} · {variant.unitsPerPack} unit(s)
                      </div>
                      <div className="mt-1">
                        <Price
                          amount={variant.price}
                          compareAtAmount={variant.compareAtPrice}
                          size="sm"
                        />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quantity Stepper & Add to Cart */}
          <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
            <div className="input-group" style={{ width: 150 }}>
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label="Decrease quantity"
                disabled={!canAdd || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <input
                type="number"
                className="form-control text-center"
                aria-label="Quantity"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))
                }
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label="Increase quantity"
                disabled={!canAdd || quantity >= maxQty}
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              >
                +
              </button>
            </div>

            <button
              type="button"
              className="btn btn-success btn-lg px-4 flex-grow-1"
              disabled={!canAdd || submitting}
              onClick={handleAddToCart}
            >
              <i className="bi bi-cart-plus me-2" aria-hidden="true" />
              {submitting
                ? 'Adding...'
                : canAdd
                  ? 'Add to Cart'
                  : 'Currently Out of Stock'}
            </button>
          </div>

          {/* Product Attributes */}
          {product.attributes.length > 0 && (
            <div className="mt-4">
              <h2 className="h6 fw-bold mb-2">Specifications</h2>
              <table className="table table-sm table-bordered mb-0">
                <tbody>
                  {product.attributes.map((attr, idx) => (
                    <tr key={`${attr.name}-${idx}`}>
                      <th className="bg-light w-25 small">{attr.name}</th>
                      <td className="small">{attr.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
