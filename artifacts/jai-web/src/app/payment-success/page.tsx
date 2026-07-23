'use client';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

const FALLBACK = (
  <div
    style={{ minHeight: '100vh', backgroundColor: '#0F0826' }}
    data-fallback="payment-success"
  />
);

export default function PaymentSuccessPage() {
  const [PaymentSuccess, setPaymentSuccess] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    import('@/screens/PaymentSuccess').then((mod) => {
      if (alive) setPaymentSuccess(() => mod.default);
    });
    return () => { alive = false; };
  }, []);

  if (!PaymentSuccess) return FALLBACK;
  return <PaymentSuccess />;
}
