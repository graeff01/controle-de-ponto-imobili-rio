import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  Users,
  Timer,
  FileText,
  Settings,
  Calendar,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuSections = [
    {
      title: 'PRINCIPAL',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/registros', icon: Clock, label: 'Registros' },
        { path: '/usuarios', icon: Users, label: 'Funcionários' }
      ]
    },
    {
      title: 'GESTÃO',
      items: [
        { path: '/banco-horas', icon: Timer, label: 'Banco de Horas' },
        { path: '/justificativas', icon: FileText, label: 'Justificativas' },
        { path: '/ajustes', icon: Settings, label: 'Ajustes' },
        { path: '/aprovacoes', icon: CheckCircle, label: 'Aprovações' }, // ✅ Novo
        { path: '/feriados', icon: Calendar, label: 'Feriados' }, // ✅ Novo
        { path: '/relatorio-mensal', icon: Calendar, label: 'Relatório Mensal' }
      ]
    },
    {
      title: 'SISTEMA',
      items: [
        { path: '/auditoria', icon: Shield, label: 'Auditoria' }
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.div
      animate={{ width: collapsed ? 80 : 280 }}
      className="fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
            <Clock className="text-white" size={24} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-white font-bold text-lg">ControlePonto</h1>
              <p className="text-slate-400 text-xs">Sistema de Gestão</p>
            </div>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
            <User className="text-slate-300" size={20} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">
                {user?.nome || 'Admin'}
              </p>
              <p className="text-slate-400 text-xs">{user?.role || 'Admin'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        {menuSections.map((section, idx) => (
          <div key={idx} className="mb-6">
            {!collapsed && (
              <p className="px-6 text-xs font-semibold text-slate-500 uppercase mb-2">
                {section.title}
              </p>
            )}
            <div className="space-y-1 px-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    whileHover={{ x: 4 }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                      ${isActive
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {!collapsed && (
                      <span className="font-medium text-sm">{item.label}</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Sair</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-all"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </motion.div>
  );
}