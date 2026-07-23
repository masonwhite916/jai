'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const Home = dynamic(() => import('@/screens/Home'), { ssr: false });

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F0826]" />}>
      <Home />
    </Suspense>
  );
}
