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
  Menu,
  MapPin
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
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'funcionario', 'employee'] },
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
      title: 'MEU PONTO',
      items: [
        {
          path: '/ponto-externo',
          icon: MapPin,
          label: 'Ponto Externo',
          roles: ['admin', 'manager', 'funcionario', 'employee'],
          check: (user) => user?.cargo?.toLowerCase().includes('consultor')
        }
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
        className={`fixed left-0 top-0 h-screen bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 z-50 flex flex-col shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center flex-shrink-0">
              <Clock className="text-white" size={20} />
            </div>
            {(!collapsed || isMobile) && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-white font-extrabold text-sm tracking-tight uppercase">Auxiliadora Predial</h1>
                <p className="text-emerald-500 text-[10px] font-bold tracking-[0.2em] uppercase opacity-80">Jardim do Lago</p>
              </div>
            )}
          </div>
        </div>


        {/* User Info */}
        <div className="p-4 border-b border-slate-800/50 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center flex-shrink-0 shadow-lg">
              <User className="text-slate-400" size={18} />
            </div>
            {(!collapsed || isMobile) && (
              <div className="overflow-hidden whitespace-nowrap">
                <p className="text-white font-bold text-sm tracking-tight truncate max-w-[150px]">
                  {user?.nome || 'Admin'}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{user?.role || 'Admin'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {menuSections.map((section, idx) => {
            // Filter items based on user role and custom check
            const filteredItems = section.items.filter(item => {
              const roleMatch = !item.roles || item.roles.includes(user?.role || 'employee');
              const checkMatch = !item.check || item.check(user);
              return roleMatch && checkMatch;
            });

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
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group
                          ${isActive
                            ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                            : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                          }
                        `}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute left-0 w-1 h-5 bg-emerald-500 rounded-r-full"
                          />
                        )}
                        <Icon size={18} className={`flex-shrink-0 transition-colors ${isActive ? 'text-emerald-500' : 'group-hover:text-slate-200'}`} />
                        {(!collapsed || isMobile) && (
                          <span className="font-semibold text-[13px] tracking-tight whitespace-nowrap">{item.label}</span>
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