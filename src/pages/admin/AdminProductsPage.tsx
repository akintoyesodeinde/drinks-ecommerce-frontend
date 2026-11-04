import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, catalogApi } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatNaira } from '../../utils/format';
import type {
  AdminProductDto,
  PackType,
  VariantInput,
} from '../../types/api';

const PACK_TYPES: PackType[] = ['Single', 'Multipack', 'Carton', 'Crate', 'Sachet', 'Bundle'];

export const AdminProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [page, setPage] = useState(1);

  const [editingProduct, setEditingProduct] = useState<AdminProductDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Product Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [isAlcoholic, setIsAlcoholic] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [attributes, setAttributes] = useState<{ name: string; value: string }[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [saving, setSaving] = useState(false);

  // Add/Edit Variant Modal for existing product
  const [variantForm, setVariantForm] = useState<VariantInput>({
    sku: '',
    name: '',
    packType: 'Carton',
    unitsPerPack: 12,
    unitVolumeMl: 500,
    price: 5000,
    compareAtPrice: null,
    isActive: true,
    lowStockThreshold: 10,
    initialStock: 50,
  });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
  });

  const { data: productsPage, isLoading } = useQuery({
    queryKey: ['admin-products', { search, categoryId, includeInactive, page }],
    queryFn: () =>
      adminApi.listProducts({
        search: search || undefined,
        categoryId: categoryId || undefined,
        includeInactive,
        page,
        pageSize: 12,
      }),
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setIsCreating(true);
    setName('');
    setBrand('');
    setProdCategoryId(categories[0]?.id || '');
    setDescription('');
    setIsAlcoholic(false);
    setIsFeatured(false);
    setIsActive(true);
    setAttributes([{ name: 'Origin', value: 'Nigeria' }]);
    setVariants([
      {
        sku: `SKU-${Date.now().toString().slice(-4)}`,
        name: 'Carton (12 x 50cl)',
        packType: 'Carton',
        unitsPerPack: 12,
        unitVolumeMl: 500,
        price: 6500,
        compareAtPrice: null,
        isActive: true,
        lowStockThreshold: 10,
        initialStock: 25,
      },
    ]);
  };

  const openEditModal = async (id: string) => {
    try {
      const detail = await adminApi.getProduct(id);
      setIsCreating(false);
      setEditingProduct(detail);
      setName(detail.name);
      setBrand(detail.brand);
      setProdCategoryId(detail.categoryId);
      setDescription(detail.description);
      setIsAlcoholic(detail.isAlcoholic);
      setIsFeatured(detail.isFeatured);
      setIsActive(detail.isActive);
      setAttributes(detail.attributes);
      setEditingVariantId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load product', 'danger');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isCreating) {
        await adminApi.createProduct({
          name,
          brand,
          categoryId: prodCategoryId,
          description,
          isAlcoholic,
          isFeatured,
          isActive,
          attributes: attributes.filter((a) => a.name.trim()),
          variants,
        });
        showToast('Product created!', 'success');
        setIsCreating(false);
      } else if (editingProduct) {
        const updated = await adminApi.updateProduct(editingProduct.id, {
          name,
          brand,
          categoryId: prodCategoryId,
          description,
          isAlcoholic,
          isFeatured,
          isActive,
          attributes: attributes.filter((a) => a.name.trim()),
        });
        setEditingProduct(updated);
        showToast('Product updated!', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVariantOnExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const updated = editingVariantId
        ? await adminApi.updateVariant(editingProduct.id, editingVariantId, variantForm)
        : await adminApi.addVariant(editingProduct.id, variantForm);
      setEditingProduct(updated);
      setEditingVariantId(null);
      showToast('Variant saved!', 'success');
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Variant save failed', 'danger');
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !imageFile) return;
    try {
      const updated = await adminApi.uploadProductImage(
        editingProduct.id,
        imageFile,
        imageAlt || undefined,
      );
      setEditingProduct(updated);
      setImageFile(null);
      setImageAlt('');
      showToast('Image uploaded!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'danger');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!editingProduct) return;
    try {
      const updated = await adminApi.deleteProductImage(editingProduct.id, imageId);
      setEditingProduct(updated);
      showToast('Image deleted', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete image', 'danger');
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deletingProductId) return;
    try {
      await adminApi.deleteProduct(deletingProductId);
      showToast('Product deactivated', 'info');
      setDeletingProductId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Deactivate failed', 'danger');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0">Catalog Products</h1>
        {isAdmin && (
          <button type="button" className="btn btn-success" onClick={openCreateModal}>
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            New Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body row g-2 align-items-center">
          <div className="col-md-4">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search name, brand, SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-md-4">
            <select
              className="form-select form-select-sm"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <div className="form-check form-switch mb-0">
              <input
                id="admin-prod-inactive"
                type="checkbox"
                className="form-check-input"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              <label htmlFor="admin-prod-inactive" className="form-check-label small">
                Include Inactive
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Product Editor Section */}
      {(isCreating || editingProduct) && (
        <div className="card shadow-sm border-success mb-4">
          <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <span className="fw-bold">
              {isCreating ? 'Create New Product' : `Edit Product: ${editingProduct?.name}`}
            </span>
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close editor"
              onClick={() => {
                setIsCreating(false);
                setEditingProduct(null);
              }}
            />
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveProduct}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Product Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Brand</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Category</label>
                  <select
                    className="form-select form-select-sm"
                    required
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">Description</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="col-12 d-flex gap-4">
                  <div className="form-check">
                    <input
                      id="prod-active"
                      type="checkbox"
                      className="form-check-input"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <label htmlFor="prod-active" className="form-check-label small">
                      Active
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      id="prod-featured"
                      type="checkbox"
                      className="form-check-input"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                    />
                    <label htmlFor="prod-featured" className="form-check-label small">
                      Featured
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      id="prod-alcoholic"
                      type="checkbox"
                      className="form-check-input"
                      checked={isAlcoholic}
                      onChange={(e) => setIsAlcoholic(e.target.checked)}
                    />
                    <label htmlFor="prod-alcoholic" className="form-check-label small">
                      Alcoholic
                    </label>
                  </div>
                </div>

                {/* Attributes Editor */}
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small fw-bold">Attributes</span>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary btn-sm"
                      onClick={() =>
                        setAttributes((prev) => [...prev, { name: '', value: '' }])
                      }
                    >
                      + Add Attribute
                    </button>
                  </div>
                  {attributes.map((attr, idx) => (
                    <div key={idx} className="row g-2 mb-2">
                      <div className="col-5">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Attribute name"
                          value={attr.name}
                          onChange={(e) =>
                            setAttributes((prev) =>
                              prev.map((a, i) =>
                                i === idx ? { ...a, name: e.target.value } : a,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="col-5">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Value"
                          value={attr.value}
                          onChange={(e) =>
                            setAttributes((prev) =>
                              prev.map((a, i) =>
                                i === idx ? { ...a, value: e.target.value } : a,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="col-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger w-100"
                          onClick={() =>
                            setAttributes((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <button type="submit" className="btn btn-success btn-sm mt-3" disabled={saving}>
                  {saving ? 'Saving...' : isCreating ? 'Create Product' : 'Save Product Details'}
                </button>
              )}
            </form>

            {/* Variants & Images for Existing Product */}
            {editingProduct && (
              <>
                <hr />
                <h3 className="h6 fw-bold">Variants / Pack Options</h3>
                <div className="table-responsive mb-3">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Pack</th>
                        <th>Price</th>
                        <th>On Hand / Avail</th>
                        {isAdmin && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {editingProduct.variants.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <code>{v.sku}</code>
                          </td>
                          <td>{v.name}</td>
                          <td>
                            {v.packType} ({v.unitsPerPack})
                          </td>
                          <td>{formatNaira(v.price)}</td>
                          <td>
                            {v.onHand} / {v.available}
                          </td>
                          {isAdmin && (
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-dark"
                                onClick={() => {
                                  setEditingVariantId(v.id);
                                  setVariantForm({
                                    sku: v.sku,
                                    name: v.name,
                                    packType: v.packType,
                                    unitsPerPack: v.unitsPerPack,
                                    unitVolumeMl: v.unitVolumeMl,
                                    price: v.price,
                                    compareAtPrice: v.compareAtPrice,
                                    isActive: v.isActive,
                                    lowStockThreshold: v.lowStockThreshold,
                                  });
                                }}
                              >
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isAdmin && (
                  <form onSubmit={handleSaveVariantOnExisting} className="bg-light p-3 rounded border mb-3">
                    <div className="fw-bold small mb-2">
                      {editingVariantId ? 'Update Variant' : 'Add New Variant'}
                    </div>
                    <div className="row g-2">
                      <div className="col-md-3">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="SKU"
                          required
                          value={variantForm.sku}
                          onChange={(e) =>
                            setVariantForm({ ...variantForm, sku: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-3">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Variant Name"
                          required
                          value={variantForm.name}
                          onChange={(e) =>
                            setVariantForm({ ...variantForm, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-2">
                        <select
                          className="form-select form-select-sm"
                          value={variantForm.packType}
                          onChange={(e) =>
                            setVariantForm({
                              ...variantForm,
                              packType: e.target.value as PackType,
                            })
                          }
                        >
                          {PACK_TYPES.map((pt) => (
                            <option key={pt} value={pt}>
                              {pt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Price (₦)"
                          required
                          value={variantForm.price}
                          onChange={(e) =>
                            setVariantForm({
                              ...variantForm,
                              price: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="col-md-2">
                        <button type="submit" className="btn btn-sm btn-dark w-100">
                          {editingVariantId ? 'Update' : 'Add Variant'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Images */}
                <h3 className="h6 fw-bold">Product Images</h3>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {editingProduct.images.map((img) => (
                    <div key={img.id} className="border rounded p-2 text-center bg-white">
                      <img
                        src={img.url}
                        alt={img.altText || ''}
                        style={{ width: 64, height: 64, objectFit: 'contain' }}
                      />
                      {isAdmin && (
                        <div className="mt-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0 px-1"
                            onClick={() => void handleDeleteImage(img.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isAdmin && (
                  <form onSubmit={handleUploadImage} className="row g-2 align-items-center">
                    <div className="col-md-5">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="form-control form-control-sm"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="col-md-4">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Alt text"
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                      />
                    </div>
                    <div className="col-md-3">
                      <button
                        type="submit"
                        className="btn btn-sm btn-outline-success w-100"
                        disabled={!imageFile}
                      >
                        Upload Image
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Products Table */}
      {isLoading ? (
        <LoadingSpinner label="Loading products..." />
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Variants</th>
                  <th>Price Range</th>
                  <th>Available Stock</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(productsPage?.items ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold">{p.name}</td>
                    <td>{p.brand}</td>
                    <td>{p.categoryName}</td>
                    <td>{p.variantCount}</td>
                    <td>
                      {formatNaira(p.minPrice)}
                      {p.maxPrice > p.minPrice ? ` – ${formatNaira(p.maxPrice)}` : ''}
                    </td>
                    <td>{p.totalAvailable}</td>
                    <td>
                      <span
                        className={`badge text-bg-${p.isActive ? 'success' : 'secondary'}`}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-dark me-1"
                        onClick={() => void openEditModal(p.id)}
                      >
                        {isAdmin ? 'Manage' : 'View'}
                      </button>
                      {isAdmin && p.isActive && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeletingProductId(p.id)}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {productsPage && (
        <Pagination
          page={productsPage.page}
          totalPages={productsPage.totalPages}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingProductId)}
        title="Deactivate Product"
        message="Are you sure you want to deactivate this product? Order history will be preserved."
        confirmLabel="Deactivate"
        onConfirm={() => void handleConfirmDeleteProduct()}
        onCancel={() => setDeletingProductId(null)}
      />
    </div>
  );
};
