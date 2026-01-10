import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, X, UserPlus, Clock } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import api from '../services/api';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    matricula: '',
    cpf: '',
    nome: '',
    email: '',
    password: '',
    cargo: '',
    departamento: '',
    status: 'ativo',
    work_hours_start: '08:00',
    work_hours_end: '18:00',
    expected_daily_hours: 9
  });

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsuarios(response.data.data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (usuario = null) => {
    if (usuario) {
      setEditando(usuario);
      setFormData({
        matricula: usuario.matricula,
        cpf: usuario.cpf,
        nome: usuario.nome,
        email: usuario.email,
        password: '',
        cargo: usuario.cargo || '',
        departamento: usuario.departamento || '',
        status: usuario.status,
        work_hours_start: usuario.work_hours_start || '08:00',
        work_hours_end: usuario.work_hours_end || '18:00',
        expected_daily_hours: usuario.expected_daily_hours || 9
      });
    } else {
      setEditando(null);
      setFormData({
        matricula: '',
        cpf: '',
        nome: '',
        email: '',
        password: '',
        cargo: '',
        departamento: '',
        status: 'ativo',
        work_hours_start: '08:00',
        work_hours_end: '18:00',
        expected_daily_hours: 9
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editando) {
        await api.put(`/users/${editando.id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      
      setShowModal(false);
      carregarUsuarios();
      alert(editando ? 'Usuário atualizado!' : 'Usuário criado!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const desativarUsuario = async (id) => {
    if (!confirm('Deseja realmente desativar este usuário?')) return;
    
    try {
      await api.post(`/users/${id}/deactivate`);
      carregarUsuarios();
    } catch (err) {
      alert('Erro ao desativar usuário');
    }
  };

  return (
    <Layout title="Gerenciar Funcionários" subtitle={`${usuarios.length} funcionário(s) cadastrado(s)`}>
      
      <div className="flex justify-end mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => abrirModal()}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2"
        >
          <UserPlus size={20} />
          Novo Funcionário
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
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Funcionário
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Horário
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((usuario, idx) => (
                  <motion.tr
                    key={usuario.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {usuario.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{usuario.nome}</p>
                          <p className="text-sm text-slate-500">{usuario.matricula} • {usuario.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{usuario.cargo}</p>
                      <p className="text-sm text-slate-500">{usuario.departamento}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock size={16} className="text-slate-400" />
                        <span>{usuario.work_hours_start || '08:00'} - {usuario.work_hours_end || '18:00'}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{usuario.expected_daily_hours || 9}h/dia</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={usuario.status === 'ativo' ? 'success' : 'danger'}>
                        {usuario.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModal(usuario)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                          title="Editar"
                        >
                          <Edit2 size={18} className="text-slate-400 group-hover:text-blue-600" />
                        </button>
                        <button
                          onClick={() => desativarUsuario(usuario.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                          title="Desativar"
                        >
                          <Trash2 size={18} className="text-slate-400 group-hover:text-red-600" />
                        </button>
                      </div>
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-3xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editando ? 'Editar Funcionário' : 'Novo Funcionário'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Matrícula"
                  value={formData.matricula}
                  onChange={(e) => setFormData({...formData, matricula: e.target.value})}
                  required
                  disabled={!!editando}
                />
                <Input
                  label="CPF"
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                  required
                  disabled={!!editando}
                />
              </div>

              <Input
                label="Nome Completo"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                required
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />

              <Input
                label={editando ? "Senha (deixe vazio para não alterar)" : "Senha"}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required={!editando}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                />
                <Input
                  label="Departamento"
                  value={formData.departamento}
                  onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                />
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 mt-4 text-slate-900">Horário de Trabalho</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Entrada</label>
                    <input
                      type="time"
                      value={formData.work_hours_start}
                      onChange={(e) => setFormData({...formData, work_hours_start: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Saída</label>
                    <input
                      type="time"
                      value={formData.work_hours_end}
                      onChange={(e) => setFormData({...formData, work_hours_end: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Horas/Dia</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="12"
                      value={formData.expected_daily_hours}
                      onChange={(e) => setFormData({...formData, expected_daily_hours: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Horário padrão: 8h-18h (9h de trabalho, descontando 1h de intervalo)
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" fullWidth>
                  {editando ? 'Salvar Alterações' : 'Criar Funcionário'}
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