import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { authApi } from '../../api/endpoints';
import { TextField } from '../../components/common/FormInput';
import { isValidNigerianPhone } from '../../utils/format';

// 1. Login Page
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const returnUrl = searchParams.get('returnUrl') || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const user = await login(values);
      showToast(`Welcome back, ${user.firstName}!`, 'success');
      navigate(returnUrl, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Invalid email or password');
    }
  };

  return (
    <div className="container py-5">
      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: 440 }}>
        <div className="card-body p-4">
          <h1 className="h4 fw-bold mb-1 text-center">Sign In</h1>
          <p className="text-muted small text-center mb-4">
            Access your DrinksEcommerce account and orders
          </p>

          {serverError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              label="Email Address"
              type="email"
              autoComplete="email"
              required
              error={errors.email?.message}
              {...register('email')}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="d-flex justify-content-end mb-3">
              <Link to="/forgot-password" className="small text-decoration-none">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              className="btn btn-success w-100 fw-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <hr className="my-4" />
          <div className="text-center small">
            Don&apos;t have an account?{' '}
            <Link
              to={`/register?returnUrl=${encodeURIComponent(returnUrl)}`}
              className="fw-semibold text-success text-decoration-none"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Register Page
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(isValidNigerianPhone, 'Enter a valid Nigerian phone number (e.g. 08031234567)'),
  password: z
    .string()
    .regex(
      passwordRegex,
      'Password must be at least 8 characters and include uppercase, lowercase, digit, and special character',
    ),
});
type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const returnUrl = searchParams.get('returnUrl') || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const user = await registerUser(values);
      showToast(`Account created! Welcome, ${user.firstName}.`, 'success');
      navigate(returnUrl, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="container py-5">
      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: 520 }}>
        <div className="card-body p-4">
          <h1 className="h4 fw-bold mb-1 text-center">Create Your Account</h1>
          <p className="text-muted small text-center mb-4">
            Order drinks and track deliveries across Nigeria
          </p>

          {serverError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="row g-2">
              <div className="col-sm-6">
                <TextField
                  label="First Name"
                  required
                  error={errors.firstName?.message}
                  {...register('firstName')}
                />
              </div>
              <div className="col-sm-6">
                <TextField
                  label="Last Name"
                  required
                  error={errors.lastName?.message}
                  {...register('lastName')}
                />
              </div>
            </div>
            <TextField
              label="Email Address"
              type="email"
              required
              error={errors.email?.message}
              {...register('email')}
            />
            <TextField
              label="Nigerian Phone Number"
              placeholder="08031234567 or +2348031234567"
              required
              error={errors.phoneNumber?.message}
              {...register('phoneNumber')}
            />
            <TextField
              label="Password"
              type="password"
              required
              helpText="Min 8 chars with uppercase, lowercase, number, and symbol."
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="submit"
              className="btn btn-success w-100 fw-semibold mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <hr className="my-4" />
          <div className="text-center small">
            Already have an account?{' '}
            <Link to="/login" className="fw-semibold text-success text-decoration-none">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. Forgot Password Page
export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: 440 }}>
        <div className="card-body p-4">
          <h1 className="h4 fw-bold mb-2 text-center">Forgot Password</h1>
          {submitted ? (
            <div className="alert alert-success small mb-0">
              If an account exists for <strong>{email}</strong>, a password reset link has been
              sent. Check your inbox.
              <div className="mt-3">
                <Link to="/login" className="btn btn-sm btn-outline-success">
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-muted small mb-3">
                Enter your registered email address and we&apos;ll send you instructions to reset
                your password.
              </p>
              <TextField
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn btn-success w-100" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. Reset Password Page
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), token: token.trim(), newPassword });
      showToast('Password has been reset! Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: 440 }}>
        <div className="card-body p-4">
          <h1 className="h4 fw-bold mb-3 text-center">Reset Password</h1>
          {error && <div className="alert alert-danger small">{error}</div>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Reset Token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <TextField
              label="New Password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button type="submit" className="btn btn-success w-100" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// 5. Confirm Email Page
export const ConfirmEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || '';
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    userId && token ? 'loading' : 'error',
  );
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!userId || !token) {
      setStatus('error');
      setMessage('Missing userId or confirmation token in the URL.');
      return;
    }
    let active = true;
    authApi
      .confirmEmail({ userId, token })
      .then(() => {
        if (active) {
          setStatus('success');
          setMessage('Your email address has been confirmed!');
        }
      })
      .catch((err) => {
        if (active) {
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'Email confirmation failed.');
        }
      });
    return () => {
      active = false;
    };
  }, [userId, token]);

  return (
    <div className="container py-5 text-center">
      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: 460 }}>
        <div className="card-body p-4">
          <h1 className="h4 fw-bold mb-3">Email Confirmation</h1>
          {status === 'loading' && <p className="text-muted">Confirming your email...</p>}
          {status === 'success' && (
            <>
              <div className="alert alert-success">{message}</div>
              <Link to="/login" className="btn btn-success">
                Continue to Login
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="alert alert-danger">{message}</div>
              <Link to="/" className="btn btn-outline-secondary">
                Back to Home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
