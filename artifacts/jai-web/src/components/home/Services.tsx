import { motion } from 'framer-motion';
import { Zap, Fuel, CircleDashed, Truck, Lock, Wrench, Cpu } from 'lucide-react';

export default function Services() {
  const baseUrl = import.meta.env.BASE_URL;
  const services = [
    { icon: Zap, title: "Battery Charge", desc: "Instant jump-starts to get you back on the road.", featured: `${baseUrl}service-battery.jpg` },
    { icon: Truck, title: "Emergency Towing", desc: "Safe, premium towing to your preferred location.", featured: `${baseUrl}service-tow.jpg` },
    { icon: Fuel, title: "Fuel Supply", desc: "Emergency fuel delivery when you run dry." },
    { icon: CircleDashed, title: "Tire Change", desc: "Quick flat tire replacement with your spare." },
    { icon: Lock, title: "Lockout Service", desc: "Non-destructive entry if you lock your keys inside." },
    { icon: Wrench, title: "Light Mechanical", desc: "On-the-spot minor repairs by certified mechanics." },
    { icon: Cpu, title: "Computer Diagnostics", desc: "Advanced fault reading to identify underlying issues." }
  ];

  return (
    <section className="py-32 bg-[#05020D] relative z-10">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Prepared for anything.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg md:text-xl"
          >
            A full suite of premium emergency services, equipped to handle whatever the road throws at you.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {services.map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={`group rounded-[2rem] bg-[#0F0826] border border-white/5 hover:border-white/10 hover:bg-[#150B33] transition-all duration-500 flex flex-col ${s.featured ? 'md:col-span-2 lg:col-span-2 row-span-2 relative overflow-hidden min-h-[400px]' : 'p-8 min-h-[240px]'}`}
            >
              {s.featured ? (
                <>
                  <img src={s.featured} alt={s.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05020D] via-[#05020D]/60 to-transparent opacity-90" />
                  <div className="absolute bottom-0 left-0 right-0 p-10 flex flex-col justify-end">
                    <div className="w-16 h-16 rounded-full bg-[#C21875] text-white flex items-center justify-center mb-6 shadow-xl">
                      <s.icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">{s.title}</h3>
                    <p className="text-white/70 text-lg max-w-md">{s.desc}</p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="w-14 h-14 rounded-full bg-white/5 text-[#C21875] flex items-center justify-center mb-6 group-hover:bg-[#C21875] group-hover:text-white transition-colors duration-300">
                    <s.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{s.title}</h3>
                  <p className="text-white/50 leading-relaxed mt-auto">{s.desc}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}