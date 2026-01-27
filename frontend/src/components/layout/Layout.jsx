import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, title, subtitle }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="md:pl-[280px] transition-all duration-300">
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <AnimatePresence mode="wait">
          <motion.main
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="p-4 md:p-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
