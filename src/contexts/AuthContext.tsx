import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  onAuthStateChange,
  refreshAccessTokenSingleFlight,
  setAuthSession,
  updateStoredUser,
} from '../api/client';
import { authApi, cartApi } from '../api/endpoints';
import { clearGuestCart, getGuestCartSnapshots } from '../utils/guestCart';
import type { LoginRequest, RegisterRequest, UserDto, UserRole } from '../types/api';

interface AuthContextValue {
  user: UserDto | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (data: LoginRequest) => Promise<UserDto>;
  register: (data: RegisterRequest) => Promise<UserDto>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserDto>;
  hasRole: (...roles: UserRole[]) => boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserDto | null>(() => getStoredUser());
  const [isInitializing, setIsInitializing] = useState<boolean>(() => {
    return Boolean(getRefreshToken() && !getAccessToken());
  });

  useEffect(() => {
    return onAuthStateChange(() => {
      setUser(getStoredUser());
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const rt = getRefreshToken();
      const at = getAccessToken();
      if (rt && !at) {
        await refreshAccessTokenSingleFlight();
      }
      if (mounted) {
        setUser(getStoredUser());
        setIsInitializing(false);
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  const mergeGuestCartIfPresent = useCallback(async () => {
    const guestItems = getGuestCartSnapshots();
    if (guestItems.length > 0) {
      try {
        await cartApi.merge(
          guestItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        );
      } catch {
        // Ignore merge errors if a variant became unavailable
      } finally {
        clearGuestCart();
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
  }, [queryClient]);

  const login = useCallback(
    async (data: LoginRequest): Promise<UserDto> => {
      const res = await authApi.login(data);
      setAuthSession(res);
      setUser(res.user);
      await mergeGuestCartIfPresent();
      return res.user;
    },
    [mergeGuestCartIfPresent],
  );

  const register = useCallback(
    async (data: RegisterRequest): Promise<UserDto> => {
      const res = await authApi.register(data);
      setAuthSession(res);
      setUser(res.user);
      await mergeGuestCartIfPresent();
      return res.user;
    },
    [mergeGuestCartIfPresent],
  );

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    clearAuthSession();
    setUser(null);
    queryClient.clear();
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {
        // ignore logout network errors
      }
    }
  }, [queryClient]);

  const refreshProfile = useCallback(async (): Promise<UserDto> => {
    const profile = await authApi.getProfile();
    updateStoredUser(profile);
    setUser(profile);
    return profile;
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.some((r) => user.roles.includes(r));
    },
    [user],
  );

  const isStaff = Boolean(
    user &&
      (user.roles.includes('Administrator') ||
        user.roles.includes('WarehouseStaff') ||
        user.roles.includes('DeliveryStaff')),
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isInitializing,
        login,
        register,
        logout,
        refreshProfile,
        hasRole,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
