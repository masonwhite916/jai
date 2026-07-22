'use client';
import dynamic from 'next/dynamic';

const PaymentSuccess = dynamic(() => import('@/screens/PaymentSuccess'), { ssr: false });

export default function PaymentSuccessPage() {
  return <PaymentSuccess />;
}
