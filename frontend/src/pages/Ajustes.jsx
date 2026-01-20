import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, X, Calendar, Clock } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import api from '../services/api';

export default function Ajustes() {
  const [ajustes, setAjustes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    date: '',
    time: '',
    record_type: 'entrada',
    reason: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [adjustmentsRes, usersRes] = await Promise.all([
        api.get('/adjustments'),
        api.get('/users')
      ]);
      setAjustes(adjustmentsRes.data.data || []);
      setUsuarios(usersRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar ajustes:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = () => {
    setFormData({
      user_id: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      record_type: 'entrada',
      reason: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const timestamp = `${formData.date}T${formData.time}:00`;

      await api.post('/time-records/manual', {
        user_id: formData.user_id,
        record_type: formData.record_type,
        timestamp: timestamp,
        manual_reason: formData.reason
      });

      setShowModal(false);
      carregarDados();
      alert('Ajuste registrado com sucesso!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar ajuste');
    }
  };

  const aprovarAjuste = async (id) => {
    try {
      await api.post(`/adjustments/${id}/approve`);
      carregarDados();
    } catch (err) {
      alert('Erro ao aprovar ajuste');
    }
  };

  const rejeitarAjuste = async (id) => {
    const reason = prompt('Por favor, informe o motivo da rejeição:');
    if (!reason) return;

    try {
      await api.post(`/adjustments/${id}/reject`, { reason });
      carregarDados();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao rejeitar ajuste');
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger'
    };
    return variants[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado'
    };
    return labels[status] || status;
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      entrada: '✅ Entrada',
      saida_intervalo: '⏸️ Saída Intervalo',
      retorno_intervalo: '▶️ Retorno Intervalo',
      saida_final: '🚪 Saída Final'
    };
    return tipos[tipo] || tipo;
  };

  return (
    <Layout title="Ajustes Manuais" subtitle="Adicionar ou corrigir registros de ponto">

      <div className="flex justify-end mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={abrirModal}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Ajuste
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
      ) : ajustes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="text-slate-400" size={32} />
          </div>
          <p className="text-xl font-semibold text-slate-900 mb-2">Nenhum ajuste registrado</p>
          <p className="text-slate-500">Adicione o primeiro ajuste manual de ponto</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Funcionário</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Data/Hora</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Motivo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ajustes.map((ajuste, idx) => (
                  <motion.tr
                    key={ajuste.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{ajuste.user_name}</p>
                        <p className="text-sm text-slate-500">{ajuste.user_matricula}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {getTipoLabel(ajuste.adjusted_type)}
                      {ajuste.is_addition && (
                        <span className="block text-[10px] text-blue-600 font-bold uppercase mt-1">➕ Inclusão</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-sm">{new Date(ajuste.adjusted_timestamp).toLocaleDateString('pt-BR')}</span>
                        <Clock size={16} className="text-slate-400 ml-2" />
                        <span className="text-sm">{new Date(ajuste.adjusted_timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 max-w-xs">{ajuste.reason}</p>
                      {ajuste.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1 italic">Refutado: {ajuste.rejection_reason}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusVariant(ajuste.status)}>
                        {getStatusLabel(ajuste.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {ajuste.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => aprovarAjuste(ajuste.id)}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors group"
                            title="Aprovar"
                          >
                            <Check size={18} className="text-slate-400 group-hover:text-green-600" />
                          </button>
                          <button
                            onClick={() => rejeitarAjuste(ajuste.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                            title="Rejeitar"
                          >
                            <X size={18} className="text-slate-400 group-hover:text-red-600" />
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Adicionar Registro Manual</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Funcionário</label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  required
                >
                  <option value="">Selecione...</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} - {u.matricula}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Data"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  label="Horário"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Registro</label>
                <select
                  value={formData.record_type}
                  onChange={(e) => setFormData({ ...formData, record_type: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  required
                >
                  <option value="entrada">✅ Entrada</option>
                  <option value="saida_intervalo">⏸️ Saída Intervalo</option>
                  <option value="retorno_intervalo">▶️ Retorno Intervalo</option>
                  <option value="saida_final">🚪 Saída Final</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motivo do Ajuste</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  rows="3"
                  placeholder="Ex: Esqueceu de registrar, problema técnico, etc"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" fullWidth>
                  Criar Ajuste
                </Button>
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </Layout>
  );
}