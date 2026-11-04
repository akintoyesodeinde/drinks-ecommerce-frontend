const ngnFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNaira(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return ngnFormatter.format(0);
  }
  return ngnFormatter.format(amount);
}

export function formatLagosDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatLagosDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

// Nigerian phone validation: accepts 0803xxxxxxx, +234803xxxxxxx, 234803xxxxxxx
// Prefixes: 070, 071, 080, 081, 090, 091 (followed by 8 digits)
export const NIGERIAN_PHONE_REGEX = /^(?:\+?234|0)[789][01]\d{8}$/;

export function isValidNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return NIGERIAN_PHONE_REGEX.test(cleaned);
}

export function normalizeNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return `+${cleaned}`;
  }
  return cleaned;
}

const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = 'drinks_checkout_idempotency_key';

export function getOrCreateCheckoutIdempotencyKey(): string {
  try {
    const existing = sessionStorage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    sessionStorage.setItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY, generated);
    return generated;
  } catch {
    return crypto.randomUUID();
  }
}

export function clearCheckoutIdempotencyKey(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}
