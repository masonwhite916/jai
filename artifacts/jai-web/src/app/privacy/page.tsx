'use client';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

const FALLBACK = (
  <div
    style={{ minHeight: '100vh', backgroundColor: '#0F0826' }}
    data-fallback="privacy"
  />
);

export default function PrivacyPage() {
  const [Privacy, setPrivacy] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    import('@/screens/Privacy').then((mod) => {
      if (alive) setPrivacy(() => mod.default);
    });
    return () => { alive = false; };
  }, []);

  if (!Privacy) return FALLBACK;
  return <Privacy />;
}
