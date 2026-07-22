'use client';
import dynamic from 'next/dynamic';

const Home = dynamic(() => import('@/screens/Home'), { ssr: false });

export default function HomePage() {
  return <Home />;
}
