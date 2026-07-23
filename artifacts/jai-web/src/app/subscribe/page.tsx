'use client';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

const FALLBACK = (
  <div
    style={{ minHeight: '100vh', backgroundColor: '#0F0826' }}
    data-fallback="subscribe"
  />
);

export default function SubscribePage() {
  const [Subscribe, setSubscribe] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    import('@/screens/Subscribe').then((mod) => {
      if (alive) setSubscribe(() => mod.default);
    });
    return () => { alive = false; };
  }, []);

  if (!Subscribe) return FALLBACK;
  return <Subscribe />;
}
