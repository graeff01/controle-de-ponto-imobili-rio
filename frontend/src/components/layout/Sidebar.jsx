import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  Users,
  FileText,
  Calendar,
  Settings,
  TrendingUp,
  Shield,
  DollarSign,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  {
    section: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Clock, label: 'Registros', path: '/registros' },
      { icon: Users, label: 'Funcionários', path: '/usuarios' },
    ]
  },
  {
    section: 'Gestão',
    items: [
      { icon: TrendingUp, label: 'Banco de Horas', path: '/banco-horas' },
      { icon: FileText, label: 'Justificativas', path: '/justificativas' },
      { icon: Calendar, label: 'Ajustes', path: '/ajustes' },
      { icon: DollarSign, label: 'Relatório Mensal', path: '/relatorio-mensal' },
    ]
  },
  {
    section: 'Sistema',
    items: [
      { icon: Shield, label: 'Auditoria', path: '/auditoria' },
    ]
  }
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0, width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white h-screen fixed left-0 top-0 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">ControlePonto</h1>
                <p className="text-xs text-slate-400">Sistema de Gestão</p>
              </div>
            </motion.div>
          )}
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-lg shadow-lg">
              {user?.nome?.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{user?.nome}</p>
              <p className="text-xs text-slate-400">{user?.cargo}</p>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        {menuItems.map((section, idx) => (
          <div key={idx} className="mb-6">
            {!collapsed && (
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
                {section.section}
              </p>
            )}
            
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    whileHover={{ x: collapsed ? 0 : 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30' 
                        : 'hover:bg-slate-700/50'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                    {!collapsed && (
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {item.label}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700/50">
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            w-full flex items-center gap-3 px-3 py-3 rounded-xl
            bg-red-500/10 hover:bg-red-500/20 text-red-400
            transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </motion.button>
      </div>
    </motion.aside>
  );
}