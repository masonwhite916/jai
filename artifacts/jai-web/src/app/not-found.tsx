'use client';
import dynamic from 'next/dynamic';

const NotFound = dynamic(() => import('@/screens/not-found'), { ssr: false });

export default function NotFoundPage() {
  return <NotFound />;
}
