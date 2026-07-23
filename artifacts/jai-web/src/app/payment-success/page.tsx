'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const PaymentSuccess = dynamic(() => import('@/screens/PaymentSuccess'), { ssr: false });

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F0826]" />}>
      <PaymentSuccess />
    </Suspense>
  );
}
