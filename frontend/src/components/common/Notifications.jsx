import { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, Clock, UserX } from 'lucide-react';
import api from '../../services/api';

export default function Notifications() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [mostrar, setMostrar] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 60000); // A cada minuto
    return () => clearInterval(interval);
  }, []);

  const carregarNotificacoes = async () => {
    try {
      const response = await api.get('/alerts?limit=10');
      const alerts = response.data.data || [];
      setNotificacoes(alerts);
      setNaoLidas(alerts.filter(a => a.status === 'unread').length);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    }
  };

  const marcarComoLida = async (id) => {
    try {
      await api.post(`/alerts/${id}/read`);
      carregarNotificacoes();
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'missing_exit':
        return <Clock className="text-yellow-600" size={20} />;
      case 'absence':
        return <UserX className="text-red-600" size={20} />;
      case 'late':
        return <AlertCircle className="text-orange-600" size={20} />;
      default:
        return <Bell className="text-blue-600" size={20} />;
    }
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      missing_exit: 'Saída não registrada',
      absence: 'Ausência',
      late: 'Atraso',
      overtime: 'Hora extra'
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setMostrar(!mostrar)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
      >
        <Bell size={24} />
        {naoLidas > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {naoLidas}
          </span>
        )}
      </button>

      {mostrar && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMostrar(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Notificações</h3>
                <button
                  onClick={() => setMostrar(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {notificacoes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhuma notificação
              </div>
            ) : (
              <div className="divide-y">
                {notificacoes.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      notif.status === 'unread' ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => marcarComoLida(notif.id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        {getIcon(notif.alert_type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {getTipoLabel(notif.alert_type)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {notif.message}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(notif.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}