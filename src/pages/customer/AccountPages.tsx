import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressApi, authApi, deliveryApi } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { TextField, SelectField, TextAreaField } from '../../components/common/FormInput';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { isValidNigerianPhone } from '../../utils/format';
import type { AddressDto } from '../../types/api';

// 1. Profile & Change Password Page (/account/profile)
const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(isValidNigerianPhone, 'Enter a valid Nigerian phone number'),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [resendingEmail, setResendingEmail] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: savingProfile },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phoneNumber: user?.phoneNumber || '',
    },
  });

  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    formState: { errors: pwErrors, isSubmitting: savingPw },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSaveProfile = async (values: ProfileFormValues) => {
    try {
      await authApi.updateProfile(values);
      await refreshProfile();
      showToast('Profile updated!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update profile', 'danger');
    }
  };

  const onChangePassword = async (values: ChangePasswordFormValues) => {
    try {
      await authApi.changePassword(values);
      resetPw();
      showToast('Password updated!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change password', 'danger');
    }
  };

  const handleResendConfirmation = async () => {
    setResendingEmail(true);
    try {
      await authApi.resendConfirmation();
      showToast('Confirmation email sent!', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resend email', 'danger');
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="container py-4">
      <h1 className="h3 fw-bold mb-4">My Profile</h1>

      {user && !user.emailConfirmed && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <span>Your email address ({user.email}) is not yet confirmed.</span>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            disabled={resendingEmail}
            onClick={handleResendConfirmation}
          >
            {resendingEmail ? 'Sending...' : 'Resend Confirmation'}
          </button>
        </div>
      )}

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-3">Personal Information</h2>
              <form onSubmit={handleProfileSubmit(onSaveProfile)} noValidate>
                <div className="mb-3">
                  <label className="form-label fw-medium">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={user?.email || ''}
                    disabled
                  />
                </div>
                <TextField
                  label="First Name"
                  required
                  error={profileErrors.firstName?.message}
                  {...registerProfile('firstName')}
                />
                <TextField
                  label="Last Name"
                  required
                  error={profileErrors.lastName?.message}
                  {...registerProfile('lastName')}
                />
                <TextField
                  label="Phone Number"
                  required
                  error={profileErrors.phoneNumber?.message}
                  {...registerProfile('phoneNumber')}
                />
                <button type="submit" className="btn btn-success" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-3">Change Password</h2>
              <form onSubmit={handlePwSubmit(onChangePassword)} noValidate>
                <TextField
                  label="Current Password"
                  type="password"
                  required
                  error={pwErrors.currentPassword?.message}
                  {...registerPw('currentPassword')}
                />
                <TextField
                  label="New Password"
                  type="password"
                  required
                  error={pwErrors.newPassword?.message}
                  {...registerPw('newPassword')}
                />
                <button type="submit" className="btn btn-dark" disabled={savingPw}>
                  {savingPw ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Address Book Page (/account/addresses)
const addressFormSchema = z.object({
  label: z.string().optional(),
  recipientName: z.string().min(2, 'Recipient name is required'),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(isValidNigerianPhone, 'Enter a valid Nigerian phone number'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(2, 'City is required'),
  street: z.string().min(3, 'Street is required'),
  landmark: z.string().optional(),
  postalCode: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  isDefault: z.boolean().optional(),
});
type AddressFormValues = z.infer<typeof addressFormSchema>;

export const AddressesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [editingAddress, setEditingAddress] = useState<AddressDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingAddress, setDeletingAddress] = useState<AddressDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressApi.list(),
  });

  const { data: states = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo'] } = useQuery({
    queryKey: ['delivery-states'],
    queryFn: () => deliveryApi.getStates(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      state: 'Lagos',
      isDefault: false,
    },
  });

  const openCreateForm = () => {
    setEditingAddress(null);
    reset({
      label: '',
      recipientName: '',
      phoneNumber: '',
      state: 'Lagos',
      city: '',
      street: '',
      landmark: '',
      postalCode: '',
      deliveryInstructions: '',
      isDefault: addresses.length === 0,
    });
    setShowForm(true);
  };

  const openEditForm = (addr: AddressDto) => {
    setEditingAddress(addr);
    reset({
      label: addr.label || '',
      recipientName: addr.recipientName,
      phoneNumber: addr.phoneNumber,
      state: addr.state,
      city: addr.city,
      street: addr.street,
      landmark: addr.landmark || '',
      postalCode: addr.postalCode || '',
      deliveryInstructions: addr.deliveryInstructions || '',
      isDefault: addr.isDefault,
    });
    setShowForm(true);
  };

  const onSubmit = async (values: AddressFormValues) => {
    try {
      if (editingAddress) {
        await addressApi.update(editingAddress.id, values);
        showToast('Address updated!', 'success');
      } else {
        await addressApi.create(values);
        showToast('Address saved!', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowForm(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save address', 'danger');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAddress) return;
    setDeleting(true);
    try {
      await addressApi.remove(deletingAddress.id);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      showToast('Address deleted', 'info');
      setDeletingAddress(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete address', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0">Address Book</h1>
        <button type="button" className="btn btn-success" onClick={openCreateForm}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          Add New Address
        </button>
      </div>

      {showForm && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body p-4">
            <h2 className="h5 fw-bold mb-3">
              {editingAddress ? 'Edit Address' : 'New Delivery Address'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="row g-3">
                <div className="col-md-4">
                  <TextField
                    label="Address Label"
                    placeholder="e.g. Home, Office"
                    error={errors.label?.message}
                    {...register('label')}
                  />
                </div>
                <div className="col-md-4">
                  <TextField
                    label="Recipient Name"
                    required
                    error={errors.recipientName?.message}
                    {...register('recipientName')}
                  />
                </div>
                <div className="col-md-4">
                  <TextField
                    label="Phone Number"
                    placeholder="08031234567"
                    required
                    error={errors.phoneNumber?.message}
                    {...register('phoneNumber')}
                  />
                </div>
                <div className="col-md-6">
                  <SelectField
                    label="State"
                    required
                    options={states.map((s) => ({ value: s, label: s }))}
                    error={errors.state?.message}
                    {...register('state')}
                  />
                </div>
                <div className="col-md-6">
                  <TextField
                    label="City / Town"
                    required
                    error={errors.city?.message}
                    {...register('city')}
                  />
                </div>
                <div className="col-12">
                  <TextField
                    label="Street Address"
                    required
                    error={errors.street?.message}
                    {...register('street')}
                  />
                </div>
                <div className="col-md-6">
                  <TextField
                    label="Landmark"
                    error={errors.landmark?.message}
                    {...register('landmark')}
                  />
                </div>
                <div className="col-md-6">
                  <TextField
                    label="Postal Code"
                    error={errors.postalCode?.message}
                    {...register('postalCode')}
                  />
                </div>
                <div className="col-12">
                  <TextAreaField
                    label="Delivery Instructions"
                    rows={2}
                    error={errors.deliveryInstructions?.message}
                    {...register('deliveryInstructions')}
                  />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      id="addr-default"
                      type="checkbox"
                      className="form-check-input"
                      {...register('isDefault')}
                    />
                    <label htmlFor="addr-default" className="form-check-label">
                      Set as default delivery address
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner label="Loading saved addresses..." />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon="bi-geo-alt"
          title="No saved addresses yet"
          description="Save your home or office delivery addresses for faster checkout."
        />
      ) : (
        <div className="row g-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="col-md-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold">{addr.label || addr.recipientName}</span>
                      <div className="d-flex gap-1">
                        {addr.isDefault && <span className="badge text-bg-success">Default</span>}
                        {addr.isServiceable ? (
                          <span className="badge text-bg-info">Serviceable</span>
                        ) : (
                          <span className="badge text-bg-warning">Non-Serviceable Zone</span>
                        )}
                      </div>
                    </div>
                    <div className="small text-muted">
                      <div>
                        <strong>{addr.recipientName}</strong> · {addr.phoneNumber}
                      </div>
                      <div>{addr.street}</div>
                      <div>
                        {addr.city}, {addr.state} {addr.postalCode || ''}
                      </div>
                      {addr.landmark && <div>Landmark: {addr.landmark}</div>}
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-dark"
                      onClick={() => openEditForm(addr)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setDeletingAddress(addr)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingAddress)}
        title="Delete Address"
        message={`Are you sure you want to delete the address for "${deletingAddress?.recipientName}"?`}
        confirmLabel="Delete"
        isSubmitting={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingAddress(null)}
      />
    </div>
  );
};
