'use client';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

const FALLBACK = (
  <div
    style={{ minHeight: '100vh', backgroundColor: '#0F0826' }}
    data-fallback="home"
  />
);

export default function HomePage() {
  const [Home, setHome] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    import('@/screens/Home').then((mod) => {
      if (alive) setHome(() => mod.default);
    });
    return () => { alive = false; };
  }, []);

  if (!Home) return FALLBACK;
  return <Home />;
}
