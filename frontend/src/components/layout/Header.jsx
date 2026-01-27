import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Check, X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBell = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAlerts = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'gestor')) return;
    try {
      // Busca alertas não resolvidos (status=open)
      const response = await api.get('/alerts', { params: { status: 'open' } });
      const data = response.data.data || [];
      setAlerts(data);
      setUnreadCount(data.length);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Polling a cada 60s
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/alerts/${id}/dismiss`); // Usando dismiss para remover da lista
      setAlerts(prev => prev.filter(a => a.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <AlertTriangle size={16} className="text-red-500" />;
      case 'medium': return <AlertCircle size={16} className="text-orange-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'gestor')) {
    return null; // Apenas gestores veem alertas
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Notificações</h3>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                {unreadCount} novas
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <Bell size={24} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhuma notificação pendente.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors relative group">
                      <div className="flex gap-3">
                        <div className="mt-1 flex-shrink-0">
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-slate-800 mb-1">{alert.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed mb-2">
                            {alert.description}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(alert.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleMarkAsRead(alert.id, e)}
                          className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-200 rounded opacity-0 group-hover:opacity-100 transition-all"
                          title="Arquivar notificação"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {alerts.length > 0 && (
              <div className="p-2 bg-slate-50 text-center border-t border-slate-100">
                <button
                  onClick={() => navigate('/ajustes')} // Exemplo de ação
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver todas as pendências
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { Menu } from 'lucide-react'; // Importar Menu

export default function Header({ title, subtitle, onMenuClick }) { // Receber onMenuClick
  return (
    <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-40">
      <div className="px-6 md:px-10 py-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-2xl text-slate-600 transition-colors"
            >
              <Menu size={24} />
            </button>

            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-slate-400 mt-0.5 text-xs md:text-sm font-bold uppercase tracking-widest hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Search - Visível apenas em Telas Médias e Desktop */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Busca rápida..."
                className="pl-11 pr-5 py-2.5 rounded-2xl border border-slate-200/60 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all w-72 bg-white/50 font-medium text-sm"
              />
            </div>

            {/* Notifications */}
            <NotificationBell />

            {/* Date Display */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">Hoje</p>
                <p className="text-sm font-black text-slate-900 mt-1 leading-none">
                  {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
