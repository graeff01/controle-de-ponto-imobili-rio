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
      accent: 'text-slate-900',
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-600',
    },
    green: {
      accent: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    emerald: {
      accent: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    red: {
      accent: 'text-rose-600',
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
    },
    rose: {
      accent: 'text-rose-600',
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
    },
    yellow: {
      accent: 'text-amber-600',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    blue: {
      accent: 'text-blue-600',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    purple: {
      accent: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.slate;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 group"
    >
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl ${scheme.iconBg} transition-colors duration-300`}>
          <Icon className={scheme.iconColor} size={24} strokeWidth={2.5} />
        </div>

        {trend && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
            {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trendValue}
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">
          {title}
        </p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">
          {value}
        </h3>
      </div>

      {/* Subtle indicator line */}
      <div className={`absolute bottom-0 left-6 right-6 h-1 rounded-t-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${color === 'green' || color === 'emerald' ? 'bg-emerald-500' :
          color === 'red' || color === 'rose' ? 'bg-rose-500' :
            color === 'blue' ? 'bg-blue-500' :
              color === 'purple' ? 'bg-indigo-500' : 'bg-slate-900'
        }`} />
    </motion.div>
  );
}