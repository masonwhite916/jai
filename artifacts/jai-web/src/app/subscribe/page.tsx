'use client';
import dynamic from 'next/dynamic';

const Subscribe = dynamic(() => import('@/screens/Subscribe'), { ssr: false });

export default function SubscribePage() {
  return <Subscribe />;
}
