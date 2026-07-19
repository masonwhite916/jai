import { Phone } from 'lucide-react';

export default function Footer() {
  const baseUrl = import.meta.env.BASE_URL;
  
  return (
    <footer className="bg-[#05020D] pt-20 pb-10 border-t border-white/5 relative z-10">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="lg:col-span-2">
            <img src={`${baseUrl}jai-logo.png`} alt="JAI" className="h-10 object-contain mb-6 opacity-90" />
            <p className="text-white/60 max-w-sm mb-8 leading-relaxed">
              The kingdom's premier roadside assistance network. We turn emergencies into minor inconveniences. Fast, safe, and professional.
            </p>
            <div className="flex items-center gap-4 text-white/80">
              <a href="https://wa.me/966555616449" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#C21875] transition-colors">
                <Phone className="w-5 h-5" />
                <span className="font-medium text-lg">+966 55 561 6449</span>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-6">Services</h4>
            <ul className="space-y-4 text-white/50 text-sm">
              <li>Battery Assistance</li>
              <li>Emergency Towing</li>
              <li>Fuel Delivery</li>
              <li>Lockout Service</li>
              <li>Tire Change</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Company</h4>
            <ul className="space-y-4 text-white/50 text-sm">
              <li>About Us</li>
              <li>Membership Plans</li>
              <li>Contact</li>
              <li>Terms & Conditions</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/40">
          <div className="text-center md:text-left space-y-1">
            <p>Membership activates within 48 hours of purchase. Valid 1 year from activation.</p>
            <p>Valid for one vehicle only.</p>
          </div>
          <div className="font-medium">
            © {new Date().getFullYear()} JAI Roadside Assistance | jai.com.sa
          </div>
        </div>
      </div>
    </footer>
  );
}