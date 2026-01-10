import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'blue',
  delay = 0 
}) {
  const colors = {
    blue: {
      bg: 'from-blue-500 to-cyan-500',
      light: 'bg-blue-50',
      text: 'text-blue-600',
      ring: 'ring-blue-500/10'
    },
    green: {
      bg: 'from-emerald-500 to-teal-500',
      light: 'bg-emerald-50',
      text: 'text-emerald-600',
      ring: 'ring-emerald-500/10'
    },
    yellow: {
      bg: 'from-amber-500 to-orange-500',
      light: 'bg-amber-50',
      text: 'text-amber-600',
      ring: 'ring-amber-500/10'
    },
    red: {
      bg: 'from-red-500 to-rose-500',
      light: 'bg-red-50',
      text: 'text-red-600',
      ring: 'ring-red-500/10'
    },
    purple: {
      bg: 'from-purple-500 to-pink-500',
      light: 'bg-purple-50',
      text: 'text-purple-600',
      ring: 'ring-purple-500/10'
    }
  };

  const scheme = colors[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
      className="relative overflow-hidden"
    >
      <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-all">
        {/* Background Gradient */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${scheme.bg} opacity-5 rounded-full -mr-16 -mt-16`} />
        
        <div className="relative">
          {/* Icon */}
          <div className={`inline-flex p-3 rounded-xl ${scheme.light} ${scheme.ring} ring-4 mb-4`}>
            <Icon className={scheme.text} size={24} />
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>

          {/* Value */}
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-bold text-slate-900">{value}</h3>

            {/* Trend */}
            {trend && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}