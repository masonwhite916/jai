'use client';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

const FALLBACK = (
  <div
    style={{ minHeight: '100vh', backgroundColor: '#0F0826' }}
    data-fallback="not-found"
  />
);

export default function NotFoundPage() {
  const [NotFound, setNotFound] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    import('@/screens/not-found').then((mod) => {
      if (alive) setNotFound(() => mod.default);
    });
    return () => { alive = false; };
  }, []);

  if (!NotFound) return FALLBACK;
  return <NotFound />;
}
