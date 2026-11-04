import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { AdminCategoryDto } from '../../types/api';

export const AdminCategoriesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminCategoryDto | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [deleting, setDeleting] = useState<AdminCategoryDto | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.listCategories(),
  });

  const handleEdit = (cat: AdminCategoryDto) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setSortOrder(cat.sortOrder);
    setIsActive(cat.isActive);
  };

  const resetForm = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setSortOrder(categories.length + 1);
    setIsActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        sortOrder,
        isActive,
      };
      if (editing) {
        await adminApi.updateCategory(editing.id, payload);
        showToast('Category updated!', 'success');
      } else {
        await adminApi.createCategory(payload);
        showToast('Category created!', 'success');
      }
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'danger');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await adminApi.deleteCategory(deleting.id);
      showToast('Category deleted', 'info');
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'danger');
      setDeleting(null);
    }
  };

  return (
    <div>
      <h1 className="h3 fw-bold mb-4">Manage Categories</h1>

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-bold">
              {editing ? `Edit: ${editing.name}` : 'Create Category'}
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Description</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Sort Order</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                  />
                </div>
                <div className="form-check mb-3">
                  <input
                    id="cat-active"
                    type="checkbox"
                    className="form-check-input"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor="cat-active" className="form-check-label small">
                    Active
                  </label>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-sm btn-success">
                    {editing ? 'Update' : 'Create'}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          {isLoading ? (
            <LoadingSpinner label="Loading categories..." />
          ) : (
            <div className="card shadow-sm border-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Order</th>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Products</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id}>
                        <td>{cat.sortOrder}</td>
                        <td className="fw-semibold">{cat.name}</td>
                        <td>
                          <code>{cat.slug}</code>
                        </td>
                        <td>{cat.productCount}</td>
                        <td>
                          <span
                            className={`badge text-bg-${cat.isActive ? 'success' : 'secondary'}`}
                          >
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark me-1"
                            onClick={() => handleEdit(cat)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleting(cat)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Category"
        message={`Delete category "${deleting?.name}"? Categories with existing products cannot be deleted.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};
