import Navbar from '@/components/layout/Navbar';
import Hero from '@/components/home/Hero';
import Trust from '@/components/home/Trust';
import Services from '@/components/home/Services';
import Pricing from '@/components/home/Pricing';
import AppDownload from '@/components/home/AppDownload';
import { Suspense, lazy } from 'react';

const Footer = lazy(() => import('@/components/layout/Footer'));

export default function Home() {
  return (
    <div className="bg-[#0F0826] min-h-screen text-white font-sans selection:bg-[#C21875]/30">
      <Navbar />
      <main>
        <Hero />
        <Trust />
        <Services />
        <Pricing />
        <AppDownload />
      </main>
      <Suspense fallback={<div className="h-48 bg-[#05020D]" />}>
        <Footer />
      </Suspense>
    </div>
  );
}