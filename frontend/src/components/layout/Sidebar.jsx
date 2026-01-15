import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  CheckCircle,
  Menu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Detect Mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuSections = [
    {
      title: 'PRINCIPAL',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager'] },
        { path: '/registros', icon: Clock, label: 'Registros', roles: ['admin', 'manager'] },
        { path: '/usuarios', icon: Users, label: 'Funcionários', roles: ['admin', 'manager'] }
      ]
    },
    {
      title: 'GESTÃO',
      items: [
        { path: '/banco-horas', icon: Timer, label: 'Banco de Horas', roles: ['admin', 'manager'] },
        { path: '/justificativas', icon: FileText, label: 'Justificativas', roles: ['admin', 'manager'] },
        { path: '/ajustes', icon: Settings, label: 'Ajustes', roles: ['admin'] }, // Apenas Admin
        { path: '/aprovacoes', icon: CheckCircle, label: 'Aprovações', roles: ['admin', 'manager'] },
        { path: '/feriados', icon: Calendar, label: 'Feriados', roles: ['admin'] }, // Apenas Admin
        { path: '/relatorio-mensal', icon: Calendar, label: 'Relatório Mensal', roles: ['admin', 'manager'] }
      ]
    },
    {
      title: 'SISTEMA',
      items: [
        { path: '/auditoria', icon: Shield, label: 'Auditoria', roles: ['admin'] } // Apenas Admin
      ]
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Variantes de Animação para Framer Motion
  const sidebarVariants = {
    desktop: {
      width: collapsed ? 80 : 280,
      x: 0,
      transition: { duration: 0.3 }
    },
    mobileOpen: {
      width: 280,
      x: 0,
      transition: { type: "spring", damping: 20 }
    },
    mobileClosed: {
      width: 280,
      x: -280,
      transition: { type: "spring", damping: 20 }
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      <motion.div
        initial={isMobile ? "mobileClosed" : "desktop"}
        animate={isMobile ? (isOpen ? "mobileOpen" : "mobileClosed") : "desktop"}
        variants={sidebarVariants}
        className={`fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 z-50 flex flex-col shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Clock className="text-white" size={24} />
            </div>
            {(!collapsed || isMobile) && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-white font-bold text-lg">Jardim do Lago</h1>
                <p className="text-slate-400 text-xs">controle de presença</p>
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
            {(!collapsed || isMobile) && (
              <div className="overflow-hidden whitespace-nowrap">
                <p className="text-white font-semibold text-sm truncate max-w-[150px]">
                  {user?.nome || 'Admin'}
                </p>
                <p className="text-slate-400 text-xs">{user?.role || 'Admin'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {menuSections.map((section, idx) => {
            // Filter items based on user role
            const filteredItems = section.items.filter(item =>
              !item.roles || item.roles.includes(user?.role || 'employee')
            );

            // If no items in section, don't render section
            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="mb-6">
                {(!collapsed || isMobile) && (
                  <p className="px-6 text-xs font-semibold text-slate-500 uppercase mb-2 whitespace-nowrap">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1 px-3">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                          ${isActive
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                          }
                        `}
                      >
                        <Icon size={20} className="flex-shrink-0" />
                        {(!collapsed || isMobile) && (
                          <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut size={20} className="flex-shrink-0" />
            {(!collapsed || isMobile) && <span className="font-medium text-sm whitespace-nowrap">Sair</span>}
          </button>

          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-all"
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}