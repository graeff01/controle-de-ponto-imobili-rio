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
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'bg-purple-100 text-purple-700',
      text: 'text-purple-900',
      border: 'border-purple-200'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.slate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{
        y: -6,
        transition: { duration: 0.2 }
      }}
      className={`
        relative overflow-hidden
        ${scheme.bg} ${scheme.border} border-2 
        rounded-3xl p-6 transition-all 
        hover:shadow-2xl hover:shadow-slate-200/50
        group
      `}
    >
      {/* Decorative Gradient Glow */}
      <div className={`
        absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-20 blur-3xl transition-all duration-500
        group-hover:opacity-30 group-hover:scale-150
        ${color === 'green' ? 'bg-emerald-400' : ''}
        ${color === 'red' ? 'bg-red-400' : ''}
        ${color === 'yellow' ? 'bg-amber-400' : ''}
        ${color === 'blue' ? 'bg-blue-400' : ''}
        ${color === 'purple' ? 'bg-purple-400' : ''}
      `} />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`${scheme.icon.split(' ')[0]} w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300`}>
          <div className={`${scheme.icon.split(' ')[1]}`}>
            <Icon size={28} />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/50 backdrop-blur-sm text-xs font-bold shadow-sm ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'
            }`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trendValue}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
        <p className={`text-4xl font-black tracking-tight ${scheme.text}`}>{value}</p>
      </div>
    </motion.div>
  );
}