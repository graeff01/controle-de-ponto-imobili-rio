import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Download, Trash2, Upload, X } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import api from '../services/api';

export default function Justificativas() {
  const [justificativas, setJustificativas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    date: '',
    reason: ''
  });
  const [arquivo, setArquivo] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [justRes, usersRes] = await Promise.all([
        api.get('/justifications'),
        api.get('/users')
      ]);
      setJustificativas(justRes.data.data || []);
      setUsuarios(usersRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar justificativas:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = () => {
    setFormData({
      user_id: '',
      date: new Date().toISOString().split('T')[0],
      reason: ''
    });
    setArquivo(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('user_id', formData.user_id);
      formDataToSend.append('date', formData.date);
      formDataToSend.append('reason', formData.reason);
      
      if (arquivo) {
        formDataToSend.append('document', arquivo);
      }

      await api.post('/justifications', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setShowModal(false);
      carregarDados();
      alert('Justificativa registrada com sucesso!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar justificativa');
    }
  };

  const baixarDocumento = async (id) => {
    try {
      const response = await api.get(`/justifications/document/${id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'documento.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Erro ao baixar documento');
    }
  };

  const deletarJustificativa = async (id) => {
    if (!confirm('Deseja realmente deletar esta justificativa?')) return;
    
    try {
      await api.delete(`/justifications/${id}`);
      carregarDados();
    } catch (err) {
      alert('Erro ao deletar justificativa');
    }
  };

  return (
    <Layout title="Justificativas de Ausência" subtitle="Gerenciar faltas e atestados">
      
      <div className="flex justify-end mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={abrirModal}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Justificativa
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
      ) : justificativas.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-slate-400" size={32} />
          </div>
          <p className="text-xl font-semibold text-slate-900 mb-2">Nenhuma justificativa registrada</p>
          <p className="text-slate-500">Adicione a primeira justificativa de ausência</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Funcionário</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Data</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Motivo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Documento</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Criado por</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {justificativas.map((just, idx) => (
                  <motion.tr
                    key={just.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{just.user_name}</p>
                        <p className="text-sm text-slate-500">{just.user_matricula}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(just.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900 max-w-xs line-clamp-2">{just.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      {just.document_name ? (
                        <button
                          onClick={() => baixarDocumento(just.id)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <FileText size={16} />
                          {just.document_name}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-sm">Sem documento</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {just.created_by_name}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => deletarJustificativa(just.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                        title="Deletar"
                      >
                        <Trash2 size={18} className="text-slate-400 group-hover:text-red-600" />
                      </button>
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
              <h2 className="text-2xl font-bold text-slate-900">Nova Justificativa</h2>
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
                  onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  required
                >
                  <option value="">Selecione...</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} - {u.matricula}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Data da Ausência"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motivo</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  rows="4"
                  placeholder="Descreva o motivo da ausência..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Documento (Atestado, comprovante, etc)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={(e) => setArquivo(e.target.files[0])}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="text-slate-400 mb-2" size={32} />
                    <p className="text-sm text-slate-600 font-medium">
                      {arquivo ? arquivo.name : 'Clique para fazer upload'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      PDF, JPG, PNG (máx 5MB)
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" fullWidth>
                  Salvar Justificativa
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