import { useState, useCallback } from "react";

export const CUSTOMER_SESSION_KEY = "cuephoria_customer_session";

export type CustomerSession = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isFirstLogin: boolean;
  loyaltyPoints: number;
  isMember: boolean;
  tenantId: string;
};

export function getCustomerSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerSession;
  } catch {
    return null;
  }
}

export function setCustomerSession(session: CustomerSession): void {
  localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
}

export function clearCustomerSession(): void {
  localStorage.removeItem(CUSTOMER_SESSION_KEY);
}

export function useCustomerSession() {
  const [session, setSessionState] = useState<CustomerSession | null>(
    () => getCustomerSession()
  );

  const setSession = useCallback((s: CustomerSession) => {
    setCustomerSession(s);
    setSessionState(s);
  }, []);

  const clearSession = useCallback(() => {
    clearCustomerSession();
    setSessionState(null);
  }, []);

  const refreshSession = useCallback(() => {
    setSessionState(getCustomerSession());
  }, []);

  return { session, setSession, clearSession, refreshSession };
}
