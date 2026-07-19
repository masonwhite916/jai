import { motion } from 'framer-motion';
import { Clock, MapPin, Shield } from 'lucide-react';

export default function Trust() {
  const baseUrl = import.meta.env.BASE_URL;
  
  const features = [
    { icon: Clock, title: "Rapid Dispatch", desc: "Our nearest unit is routed instantly. We don't make you wait in the dark." },
    { icon: MapPin, title: "Kingdom-Wide Coverage", desc: "From busy city centers to remote desert highways, we've got you covered." },
    { icon: Shield, title: "Premium Care", desc: "Highly-trained professionals handling your vehicle with the utmost respect." }
  ];

  return (
    <section className="py-32 bg-[#0F0826] relative overflow-hidden z-10">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-[2.5rem] overflow-hidden aspect-[4/5] border border-white/10 shadow-2xl group"
          >
            <img src={`${baseUrl}mechanic.jpg`} alt="JAI Mechanic" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0826] via-[#0F0826]/40 to-transparent opacity-80" />
            <div className="absolute bottom-10 left-10 right-10">
              <div className="w-16 h-1 bg-[#C21875] mb-6 rounded-full" />
              <p className="text-2xl font-light text-white italic leading-relaxed">
                "We don't just rescue vehicles. We rescue people's peace of mind."
              </p>
            </div>
          </motion.div>

          <div className="flex flex-col gap-12">
            <div>
              <motion.h2 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight"
              >
                Because panic isn't <br/> on your itinerary.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="text-white/60 text-lg md:text-xl leading-relaxed"
              >
                When your car dies at 2 AM on a desert highway, you don't want excuses. 
                You want highly-trained professionals, rapid response, and the certainty that everything will be fine. That's JAI.
              </motion.p>
            </div>

            <div className="grid gap-8">
              {features.map((f, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 + (i * 0.1), ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-5 items-start group"
                >
                  <div className="w-14 h-14 rounded-full bg-[#5B2C91]/20 flex items-center justify-center flex-shrink-0 border border-[#5B2C91]/30 group-hover:bg-[#C21875] group-hover:border-[#C21875] transition-all duration-300">
                    <f.icon className="w-6 h-6 text-[#C21875] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
                    <p className="text-white/50 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}