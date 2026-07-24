'use client';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

const FALLBACK = (
  <div
    style={{ minHeight: '100vh', backgroundColor: '#0F0826' }}
    data-fallback="terms"
  />
);

export default function TermsPage() {
  const [Terms, setTerms] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    import('@/screens/Terms').then((mod) => {
      if (alive) setTerms(() => mod.default);
    });
    return () => { alive = false; };
  }, []);

  if (!Terms) return FALLBACK;
  return <Terms />;
}
