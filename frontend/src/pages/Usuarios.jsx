import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, UserPlus, Clock, User, Briefcase, Building2, Mail, Lock, Shield } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import api from '../services/api';

export default function Usuarios() {
  // ========== STATES ==========
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [proximaMatricula, setProximaMatricula] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cargo: '',
    departamento: '',
    isAdmin: false,
    isDutyShift: false,
    email: '',
    password: '',
    work_hours_start: '08:00',
    work_hours_end: '18:00',
    expected_daily_hours: 9
  });

  // ========== EFFECTS ==========
  useEffect(() => {
    carregarUsuarios();
  }, []);

  // ========== FUNÇÕES AUXILIARES ==========
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

  const buscarProximaMatricula = async () => {
    try {
      const response = await api.get('/users/next-matricula');
      setProximaMatricula(response.data.data);
    } catch (err) {
      console.error('Erro ao buscar matrícula:', err);
      setProximaMatricula('000001');
    }
  };

  const buscarProximaMatriculaBroker = async () => {
    try {
      const response = await api.get('/users/next-matricula-broker');
      setProximaMatricula(response.data.data);
    } catch (err) {
      console.error('Erro ao buscar matrícula de corretor:', err);
      setProximaMatricula('CORR001');
    }
  };

  // Monitora mudança no checkbox de plantonista
  useEffect(() => {
    if (!editando && showModal) {
      if (formData.isDutyShift) {
        buscarProximaMatriculaBroker();
      } else {
        buscarProximaMatricula();
      }
    }
  }, [formData.isDutyShift, showModal, editando]);

  const abrirModal = (usuario = null) => {
    if (usuario) {
      setEditando(usuario);
      setFormData({
        nome: usuario.nome,
        cargo: usuario.cargo || '',
        departamento: usuario.departamento || '',
        isAdmin: usuario.role === 'admin',
        isDutyShift: usuario.is_duty_shift_only || false,
        email: usuario.email || '',
        password: '',
        work_hours_start: usuario.work_hours_start || '08:00',
        work_hours_end: usuario.work_hours_end || '18:00',
        expected_daily_hours: usuario.expected_daily_hours || 9
      });
    } else {
      setEditando(null);
      setFormData({
        nome: '',
        cargo: '',
        departamento: '',
        isAdmin: false,
        isDutyShift: false,
        email: '',
        password: '',
        work_hours_start: '08:00',
        work_hours_end: '18:00',
        expected_daily_hours: 9
      });
      buscarProximaMatricula();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        nome: formData.nome,
        cargo: formData.cargo,
        departamento: formData.departamento,
        role: formData.isAdmin ? 'admin' : 'employee',
        work_hours_start: formData.work_hours_start,
        work_hours_end: formData.work_hours_end,
        expected_daily_hours: formData.expected_daily_hours,
        user_type: formData.isDutyShift ? 'broker' : 'employee',
        is_duty_shift_only: formData.isDutyShift
      };

      if (!editando) {
        payload.matricula = proximaMatricula;
      }

      if (formData.isAdmin) {
        payload.email = formData.email;
        if (formData.password) {
          payload.password = formData.password;
        }
      }

      if (editando) {
        await api.put(`/users/${editando.id}`, payload);
      } else {
        await api.post('/users', payload);
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

  // ========== RENDER ==========
  return (
    <Layout title="Gerenciar Funcionários" subtitle={`${usuarios.length} funcionário(s) cadastrado(s)`}>
      
      {/* Botão Novo Funcionário */}
      <div className="flex justify-end mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => abrirModal()}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold shadow-lg flex items-center gap-2 transition-all"
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
              className="w-12 h-12 border-4 border-slate-800 border-t-transparent rounded-full"
            />
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ========== FUNCIONÁRIOS CLT ========== */}
          {usuarios.filter(u => !u.is_duty_shift_only).length > 0 && (
            <Card className="overflow-hidden">
              <div className="bg-slate-800 px-6 py-4">
                <div className="flex items-center gap-3">
                  <User size={20} className="text-white" />
                  <h3 className="text-white font-bold text-lg">
                    Funcionários CLT
                  </h3>
                  <Badge variant="default" className="bg-white/20 text-white border-white/30">
                    {usuarios.filter(u => !u.is_duty_shift_only).length}
                  </Badge>
                </div>
              </div>
              
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
                    {usuarios
                      .filter(usuario => !usuario.is_duty_shift_only)
                      .map((usuario, idx) => (
                        <motion.tr
                          key={usuario.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-lg">
                                {usuario.nome.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{usuario.nome}</p>
                                <p className="text-sm text-slate-500">
                                  {usuario.matricula}
                                  {usuario.role === 'admin' && (
                                    <Badge variant="info" className="ml-2">Admin</Badge>
                                  )}
                                </p>
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
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                                title="Editar"
                              >
                                <Edit2 size={18} className="text-slate-400 group-hover:text-slate-800" />
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

          {/* ========== CORRETORES PLANTONISTAS ========== */}
          {usuarios.filter(u => u.is_duty_shift_only).length > 0 && (
            <Card className="overflow-hidden">
              <div className="bg-blue-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-white" />
                  <h3 className="text-white font-bold text-lg">
                    📋 Corretores Plantonistas (PJ)
                  </h3>
                  <Badge variant="default" className="bg-white/20 text-white border-white/30">
                    {usuarios.filter(u => u.is_duty_shift_only).length}
                  </Badge>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-50 border-b border-blue-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Corretor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Cargo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {usuarios
                      .filter(usuario => usuario.is_duty_shift_only)
                      .map((usuario, idx) => (
                        <motion.tr
                          key={usuario.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                {usuario.nome.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{usuario.nome}</p>
                                <p className="text-sm text-blue-600 font-medium">
                                  {usuario.matricula}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">{usuario.cargo}</p>
                            <p className="text-sm text-slate-500">{usuario.departamento}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="warning">
                              📋 Plantonista
                            </Badge>
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
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
                                title="Editar"
                              >
                                <Edit2 size={18} className="text-slate-400 group-hover:text-blue-700" />
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

          {/* Mensagem se não houver usuários */}
          {usuarios.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-slate-500">
                <User size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-semibold">Nenhum funcionário cadastrado</p>
                <p className="text-sm mt-2">Clique em "Novo Funcionário" para começar</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal (mantém igual) */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editando ? 'Editar Funcionário' : 'Novo Funcionário'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                
                {/* Matrícula (auto) - Só aparece ao criar novo */}
                {!editando && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Matrícula (gerada automaticamente)
                    </label>
                    <div className={`px-4 py-3 border-2 rounded-xl ${
                      formData.isDutyShift 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <p className={`text-2xl font-bold text-center tracking-wider ${
                        formData.isDutyShift ? 'text-blue-900' : 'text-slate-900'
                      }`}>
                        {proximaMatricula || 'Carregando...'}
                      </p>
                      <p className={`text-xs text-center mt-1 ${
                        formData.isDutyShift ? 'text-blue-600' : 'text-slate-500'
                      }`}>
                        {formData.isDutyShift ? '📋 Corretor Plantonista' : '👤 Funcionário CLT'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Nome Completo */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <User size={16} className="inline mr-1" />
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10 outline-none transition-all"
                    required
                  />
                </div>

                {/* Cargo e Departamento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <Briefcase size={16} className="inline mr-1" />
                      Cargo
                    </label>
                    <input
                      type="text"
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10 outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <Building2 size={16} className="inline mr-1" />
                      Departamento
                    </label>
                    <input
                      type="text"
                      value={formData.departamento}
                      onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Checkbox Admin */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAdmin}
                      onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-slate-800 focus:ring-slate-800"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Shield size={18} />
                        Este usuário é administrador
                      </div>
                      <p className="text-sm text-slate-600">
                        Poderá acessar o painel administrativo
                      </p>
                    </div>
                  </label>
                </div>

                {/* Checkbox Corretor Plantonista */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDutyShift}
                      onChange={(e) => setFormData({ ...formData, isDutyShift: e.target.checked })}
                      className="w-5 h-5 rounded border-blue-300 text-blue-800 focus:ring-blue-800"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-blue-900">
                        <Clock size={18} />
                        📋 Corretor Plantonista (PJ)
                      </div>
                      <p className="text-sm text-blue-700">
                        Este usuário apenas marca presença nos plantões (não bate ponto completo)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Email e Senha (só se admin) */}
                <AnimatePresence>
                  {formData.isAdmin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-4 border-t border-slate-200"
                    >
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <Mail size={16} className="inline mr-1" />
                          Email (para login)
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10 outline-none transition-all"
                          required={formData.isAdmin}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <Lock size={16} className="inline mr-1" />
                          {editando ? 'Senha (deixe vazio para não alterar)' : 'Senha'}
                        </label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10 outline-none transition-all"
                          minLength={6}
                          required={formData.isAdmin && !editando}
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Horário de Trabalho */}
                {!formData.isDutyShift && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Clock size={18} />
                      Horário de Trabalho
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Entrada</label>
                        <input
                          type="time"
                          value={formData.work_hours_start}
                          onChange={(e) => setFormData({...formData, work_hours_start: e.target.value})}
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Saída</label>
                        <input
                          type="time"
                          value={formData.work_hours_end}
                          onChange={(e) => setFormData({...formData, work_hours_end: e.target.value})}
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Horas/Dia</label>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="12"
                          value={formData.expected_daily_hours}
                          onChange={(e) => setFormData({...formData, expected_daily_hours: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Horário padrão: 8h-18h (9h de trabalho, descontando 1h de intervalo)
                    </p>
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                    {editando ? 'Salvar Alterações' : 'Criar Funcionário'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 bg-white hover:bg-slate-50 text-slate-700 font-semibold border-2 border-slate-200 py-3 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}