import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle, AlertTriangle, RefreshCw, Download, Eye, X, ScrollText, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import api from '../services/api';

export default function GestaoTermos() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [modalUser, setModalUser] = useState(null);
  const [sigData, setSigData] = useState(null);
  const [sigLoading, setSigLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await api.get('/terms/report');
      setData(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar relatório de termos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const usersFiltrados = () => {
    if (!data?.users) return [];
    if (filtro === 'assinados') return data.users.filter(u => u.accepted_at);
    if (filtro === 'pendentes') return data.users.filter(u => !u.accepted_at);
    return data.users;
  };

  const abrirAssinatura = async (user) => {
    setModalUser(user);
    setSigData(null);
    setSigLoading(true);
    try {
      const res = await api.get(`/terms/signature/${user.id}`);
      setSigData(res.data.data);
    } catch (err) {
      setSigData({ error: 'Assinatura não encontrada' });
    } finally {
      setSigLoading(false);
    }
  };

  const baixarPdf = async (user) => {
    setDownloadingId(user.id);
    try {
      const res = await api.get(`/terms/pdf/${user.id}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Termo_${user.matricula}_${user.nome.replace(/\s+/g, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF não disponível para este funcionário');
    } finally {
      setDownloadingId(null);
    }
  };

  const exportarExcel = async () => {
    setExporting(true);
    try {
      const res = await api.get('/terms/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Termos_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao exportar relatório');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout title="Gestão de Termos" subtitle="Termos de Compromisso e Responsabilidade">

      {/* Cards de Resumo */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Funcionários"
            value={data.summary.total}
            icon={Users}
            color="blue"
            delay={0}
          />
          <StatCard
            title="Termos Assinados"
            value={data.summary.accepted}
            icon={CheckCircle}
            color="emerald"
            delay={0.1}
          />
          <StatCard
            title="Pendentes"
            value={data.summary.pending}
            icon={AlertTriangle}
            color={data.summary.pending > 0 ? 'red' : 'green'}
            delay={0.2}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none bg-white"
        >
          <option value="todos">Todos os funcionários</option>
          <option value="assinados">Apenas assinados</option>
          <option value="pendentes">Apenas pendentes</option>
        </select>
        <button
          onClick={exportarExcel}
          disabled={exporting}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 font-medium transition-colors"
        >
          {exporting ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={18} />
          )}
          Exportar Excel
        </button>
        <button
          onClick={carregarDados}
          disabled={loading}
          className="px-6 py-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 flex items-center gap-2 font-medium text-slate-700 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Versão atual */}
      {data && (
        <div className="mb-4 text-sm text-slate-500">
          Versão atual do termo: <strong>{data.current_version}</strong>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full"
            />
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden" hover={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Nome</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Matrícula</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Cargo</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase hidden lg:table-cell">Data Aceite</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersFiltrados().length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Nenhum resultado encontrado
                    </td>
                  </tr>
                ) : (
                  usersFiltrados().map((user, idx) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{user.nome}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm text-slate-600">{user.matricula}</span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600">{user.cargo || '—'}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {user.accepted_at ? (
                          <Badge variant="success">Assinado</Badge>
                        ) : (
                          <Badge variant="danger">Pendente</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {user.accepted_at ? (
                          <span className="text-sm text-slate-600">
                            {new Date(user.accepted_at).toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {user.accepted_at && (
                            <>
                              <button
                                onClick={() => abrirAssinatura(user)}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                                title="Ver assinatura"
                              >
                                <Eye size={18} className="text-slate-400 group-hover:text-blue-600" />
                              </button>
                              <button
                                onClick={() => baixarPdf(user)}
                                disabled={downloadingId === user.id}
                                className="p-2 hover:bg-emerald-50 rounded-lg transition-colors group"
                                title="Baixar PDF"
                              >
                                {downloadingId === user.id ? (
                                  <RefreshCw size={18} className="text-slate-400 animate-spin" />
                                ) : (
                                  <Download size={18} className="text-slate-400 group-hover:text-emerald-600" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de Assinatura */}
      <AnimatePresence>
        {modalUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setModalUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <ScrollText size={20} className="text-slate-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Termo Assinado</h3>
                    <p className="text-sm text-slate-500">{modalUser.nome}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalUser(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {sigLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full"
                    />
                  </div>
                ) : sigData?.error ? (
                  <div className="text-center py-8 text-slate-400">
                    {sigData.error}
                  </div>
                ) : sigData ? (
                  <div className="space-y-4">
                    {/* Metadados */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">Nome</p>
                        <p className="font-semibold text-slate-900">{sigData.nome}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">Matrícula</p>
                        <p className="font-semibold text-slate-900">{sigData.matricula}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">Cargo</p>
                        <p className="font-semibold text-slate-900">{sigData.cargo || '—'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">Versão do Termo</p>
                        <p className="font-semibold text-slate-900">{sigData.terms_version}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">Data/Hora Aceite</p>
                        <p className="font-semibold text-slate-900">
                          {new Date(sigData.accepted_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">IP</p>
                        <p className="font-semibold text-slate-900 font-mono text-xs">{sigData.ip_address}</p>
                      </div>
                    </div>

                    {/* Hash de integridade */}
                    {sigData.integrity_hash && (
                      <div className="bg-emerald-50 rounded-xl p-3 flex items-start gap-2">
                        <ShieldCheck size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-emerald-700 text-xs font-semibold mb-1">Hash de Integridade (SHA-256)</p>
                          <p className="text-xs text-emerald-800 font-mono break-all">{sigData.integrity_hash}</p>
                        </div>
                      </div>
                    )}

                    {/* User Agent */}
                    {sigData.user_agent && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">Navegador</p>
                        <p className="text-xs text-slate-700 break-all">{sigData.user_agent}</p>
                      </div>
                    )}

                    {/* Assinatura */}
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Assinatura Digital</p>
                      <div className="border-2 border-slate-200 rounded-xl p-2 bg-white">
                        {sigData.signature_data ? (
                          <img
                            src={sigData.signature_data}
                            alt="Assinatura digital"
                            className="max-w-full h-auto mx-auto"
                            style={{ maxHeight: 160 }}
                          />
                        ) : (
                          <div className="py-8 text-center text-slate-400">
                            Assinatura não disponível
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botão Download */}
                    <button
                      onClick={() => baixarPdf(modalUser)}
                      disabled={downloadingId === modalUser.id}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
                    >
                      {downloadingId === modalUser.id ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Download size={18} />
                      )}
                      Baixar PDF do Termo
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
