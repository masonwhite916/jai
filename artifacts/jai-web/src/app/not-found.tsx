'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const NotFound = dynamic(() => import('@/screens/not-found'), { ssr: false });

export default function NotFoundPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F0826]" />}>
      <NotFound />
    </Suspense>
  );
}
