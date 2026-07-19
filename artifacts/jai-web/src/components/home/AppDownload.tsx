import { motion } from 'framer-motion';
import { Smartphone, Apple, Play } from 'lucide-react';

export default function AppDownload() {
  return (
    <section className="py-32 bg-gradient-to-b from-[#0F0826] to-[#05020D] relative overflow-hidden z-10">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_bottom_right,theme(colors.primary)_0%,transparent_70%)] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="bg-[#150B33]/80 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-16 overflow-hidden shadow-2xl relative">
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#C21875]/20 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-2xl relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5B2C91] to-[#C21875] flex items-center justify-center mb-8 shadow-lg"
            >
              <Smartphone className="w-8 h-8 text-white" />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight"
            >
              Assistance in your pocket.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-white/60 mb-10 leading-relaxed max-w-xl"
            >
              Track your rescue unit in real-time, manage your membership, and request help with a single tap. Coming soon to all devices.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button className="flex items-center gap-4 bg-black hover:bg-[#111] border border-white/10 rounded-2xl px-8 py-4 transition-colors cursor-default opacity-80 group">
                <Apple className="w-8 h-8 text-white fill-white group-hover:scale-105 transition-transform" />
                <div className="text-left">
                  <div className="text-[11px] text-white/60 uppercase tracking-wider font-medium">Download on the</div>
                  <div className="text-xl font-semibold text-white leading-tight">App Store</div>
                </div>
              </button>
              <button className="flex items-center gap-4 bg-black hover:bg-[#111] border border-white/10 rounded-2xl px-8 py-4 transition-colors cursor-default opacity-80 group">
                <Play className="w-7 h-7 text-white fill-white group-hover:scale-105 transition-transform" />
                <div className="text-left">
                  <div className="text-[11px] text-white/60 uppercase tracking-wider font-medium">Get it on</div>
                  <div className="text-xl font-semibold text-white leading-tight">Google Play</div>
                </div>
              </button>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block relative z-10"
          >
            <div className="w-[300px] h-[600px] border-[8px] border-white/10 rounded-[3rem] bg-[#0F0826] relative overflow-hidden shadow-2xl flex flex-col transform rotate-2">
              <div className="h-6 w-1/3 bg-white/10 mx-auto rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 z-20" />
              <div className="flex-1 p-6 flex flex-col justify-center items-center relative z-10 text-center">
                <div className="w-20 h-20 rounded-full bg-[#C21875] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(194,24,117,0.5)]">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">JAI App</h3>
                <p className="text-white/50 text-sm">Launching soon</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#2D1B69]/40 to-transparent" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}