import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'slate',
  trend,
  trendValue,
  delay = 0 
}) {
  const colorSchemes = {
    slate: {
      bg: 'bg-slate-50',
      icon: 'bg-slate-100 text-slate-700',
      text: 'text-slate-900',
      border: 'border-slate-200'
    },
    green: {
      bg: 'bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-700',
      text: 'text-emerald-900',
      border: 'border-emerald-200'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-700',
      text: 'text-red-900',
      border: 'border-red-200'
    },
    yellow: {
      bg: 'bg-amber-50',
      icon: 'bg-amber-100 text-amber-700',
      text: 'text-amber-900',
      border: 'border-amber-200'
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-700',
      text: 'text-blue-900',
      border: 'border-blue-200'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.slate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -4 }}
      className={`${scheme.bg} ${scheme.border} border rounded-xl p-6 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`${scheme.icon} w-12 h-12 rounded-lg flex items-center justify-center`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {trendValue}
          </div>
        )}
      </div>
      <h3 className="text-slate-600 text-sm font-medium mb-1">{title}</h3>
      <p className={`text-4xl font-bold ${scheme.text}`}>{value}</p>
    </motion.div>
  );
}