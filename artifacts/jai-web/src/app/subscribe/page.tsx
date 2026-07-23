'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const Subscribe = dynamic(() => import('@/screens/Subscribe'), { ssr: false });

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F0826]" />}>
      <Subscribe />
    </Suspense>
  );
}
