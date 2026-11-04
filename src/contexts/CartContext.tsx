import React, { createContext, useCallback, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/endpoints';
import { useAuth } from './AuthContext';
import {
  clearGuestCart,
  getGuestCartSnapshots,
  setGuestCartSnapshots,
  snapshotsToCartDto,
} from '../utils/guestCart';
import type { CartDto, GuestCartItemSnapshot } from '../types/api';

interface CartContextValue {
  cart: CartDto;
  isLoading: boolean;
  addItem: (snapshot: GuestCartItemSnapshot) => Promise<CartDto>;
  updateQuantity: (itemId: string, quantity: number) => Promise<CartDto>;
  removeItem: (itemId: string) => Promise<CartDto>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<CartDto>;
  removeCoupon: () => Promise<CartDto>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitializing } = useAuth();
  const queryClient = useQueryClient();
  const [guestSnapshots, setGuestSnapshots] = useState<GuestCartItemSnapshot[]>(() =>
    getGuestCartSnapshots(),
  );

  const { data: serverCart, isLoading: isServerLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
    enabled: isAuthenticated && !isInitializing,
  });

  const cart: CartDto = isAuthenticated
    ? (serverCart ?? snapshotsToCartDto([]))
    : snapshotsToCartDto(guestSnapshots);

  const addItem = useCallback(
    async (snapshot: GuestCartItemSnapshot): Promise<CartDto> => {
      if (isAuthenticated) {
        const updated = await cartApi.addItem(snapshot.variantId, snapshot.quantity);
        queryClient.setQueryData(['cart'], updated);
        return updated;
      }

      const current = getGuestCartSnapshots();
      const idx = current.findIndex((i) => i.variantId === snapshot.variantId);
      let next: GuestCartItemSnapshot[];
      if (idx >= 0) {
        const newQty = Math.min(99, current[idx].quantity + snapshot.quantity);
        next = current.map((item, i) =>
          i === idx ? { ...item, ...snapshot, quantity: newQty } : item,
        );
      } else {
        next = [...current, { ...snapshot, quantity: Math.min(99, snapshot.quantity) }];
      }
      setGuestCartSnapshots(next);
      setGuestSnapshots(next);
      return snapshotsToCartDto(next);
    },
    [isAuthenticated, queryClient],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number): Promise<CartDto> => {
      const clamped = Math.max(1, Math.min(99, quantity));
      if (isAuthenticated) {
        const updated = await cartApi.updateItem(itemId, clamped);
        queryClient.setQueryData(['cart'], updated);
        return updated;
      }

      const current = getGuestCartSnapshots();
      const next = current.map((item) =>
        item.variantId === itemId ? { ...item, quantity: clamped } : item,
      );
      setGuestCartSnapshots(next);
      setGuestSnapshots(next);
      return snapshotsToCartDto(next);
    },
    [isAuthenticated, queryClient],
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<CartDto> => {
      if (isAuthenticated) {
        const updated = await cartApi.removeItem(itemId);
        queryClient.setQueryData(['cart'], updated);
        return updated;
      }

      const current = getGuestCartSnapshots();
      const next = current.filter((item) => item.variantId !== itemId);
      setGuestCartSnapshots(next);
      setGuestSnapshots(next);
      return snapshotsToCartDto(next);
    },
    [isAuthenticated, queryClient],
  );

  const clearCart = useCallback(async (): Promise<void> => {
    if (isAuthenticated) {
      await cartApi.clear();
      queryClient.setQueryData(['cart'], snapshotsToCartDto([]));
      return;
    }
    clearGuestCart();
    setGuestSnapshots([]);
  }, [isAuthenticated, queryClient]);

  const applyCoupon = useCallback(
    async (code: string): Promise<CartDto> => {
      const updated = await cartApi.applyCoupon(code.trim());
      queryClient.setQueryData(['cart'], updated);
      return updated;
    },
    [queryClient],
  );

  const removeCoupon = useCallback(async (): Promise<CartDto> => {
    const updated = await cartApi.removeCoupon();
    queryClient.setQueryData(['cart'], updated);
    return updated;
  }, [queryClient]);

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading: isAuthenticated ? isServerLoading : false,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
