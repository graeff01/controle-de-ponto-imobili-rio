import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, RefreshCw } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import api from '../services/api';

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTabela, setFiltroTabela] = useState('');

  useEffect(() => {
    carregarLogs();
  }, []);

  const carregarLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroTabela) params.append('table_name', filtroTabela);
      params.append('limit', '100');

      const response = await api.get(`/audit?${params.toString()}`);
      setLogs(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionVariant = (action) => {
    const variants = {
      'CREATE': 'success',
      'POST': 'success',
      'UPDATE': 'info',
      'PUT': 'info',
      'PATCH': 'info',
      'DELETE': 'danger',
      'ADJUST': 'warning'
    };
    return variants[action] || 'default';
  };

  const getActionLabel = (action) => {
    const labels = {
      'CREATE': 'Criou',
      'POST': 'Criou',
      'UPDATE': 'Atualizou',
      'PUT': 'Atualizou',
      'PATCH': 'Atualizou',
      'DELETE': 'Deletou',
      'ADJUST': 'Ajustou'
    };
    return labels[action] || action;
  };

  const getTableLabel = (tableName) => {
    const labels = {
      'users': 'Usuários',
      'time_records': 'Registros de Ponto',
      'justifications': 'Justificativas',
      'hours_bank': 'Banco de Horas',
      'adjustments': 'Ajustes'
    };
    return labels[tableName] || tableName;
  };

  return (
    <Layout title="Logs de Auditoria" subtitle="Histórico de alterações no sistema">
      
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={filtroTabela}
            onChange={(e) => setFiltroTabela(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
          >
            <option value="">Todas as Tabelas</option>
            <option value="users">Usuários</option>
            <option value="time_records">Registros de Ponto</option>
            <option value="justifications">Justificativas</option>
            <option value="hours_bank">Banco de Horas</option>
            <option value="adjustments">Ajustes</option>
          </select>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={carregarLogs}
          className="px-6 py-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all flex items-center gap-2"
        >
          <RefreshCw size={20} />
          Atualizar
        </motion.button>
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-slate-400" size={32} />
          </div>
          <p className="text-xl font-semibold text-slate-900 mb-2">Nenhum log encontrado</p>
          <p className="text-slate-500">Ajuste os filtros ou aguarde novas atividades</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Data/Hora</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Usuário</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ação</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tabela</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log, idx) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-slate-900">
                          {new Date(log.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-slate-500">
                          {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{log.user_name || 'Sistema'}</p>
                        <p className="text-sm text-slate-500">{log.user_matricula}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getActionVariant(log.action)}>
                        {getActionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {getTableLabel(log.table_name)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      {log.ip_address || '-'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Layout>
  );
}