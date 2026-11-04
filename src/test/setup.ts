import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import { clearAuthSession } from '../api/client';
import { clearGuestCart } from '../utils/guestCart';

configure({ asyncUtilTimeout: 10000 });

afterEach(() => {
  cleanup();
  clearAuthSession();
  clearGuestCart();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
