import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = true, gradient = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' } : {}}
      className={`
        bg-white rounded-xl shadow-sm border border-slate-200/60
        ${gradient ? 'bg-gradient-to-br from-white to-slate-50' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}