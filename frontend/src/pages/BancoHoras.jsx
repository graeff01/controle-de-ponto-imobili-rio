import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, ChevronRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import api from '../services/api';

export default function BancoHoras() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [detalhes, setDetalhes] = useState(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarUsuarios();
  }, [mes, ano]);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hours-bank/all?month=${mes}&year=${ano}`);
      setUsuarios(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar banco de horas:', err);
    } finally {
      setLoading(false);
    }
  };

  const verDetalhes = async (userId) => {
    try {
      const response = await api.get(`/hours-bank/user/${userId}?month=${mes}&year=${ano}`);
      setDetalhes(response.data.data);
      setUsuarioSelecionado(usuarios.find(u => u.id === userId));
    } catch (err) {
      alert('Erro ao carregar detalhes');
    }
  };

  const voltarParaLista = () => {
    setDetalhes(null);
    setUsuarioSelecionado(null);
  };

  const getSaldoColor = (saldo) => {
    const valor = parseFloat(saldo);
    if (valor > 0) return 'text-emerald-600';
    if (valor < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  const getSaldoBg = (saldo) => {
    const valor = parseFloat(saldo);
    if (valor > 0) return 'bg-emerald-50';
    if (valor < 0) return 'bg-red-50';
    return 'bg-slate-50';
  };

  const getSaldoIcon = (saldo) => {
    const valor = parseFloat(saldo);
    if (valor > 0) return <TrendingUp size={20} />;
    if (valor < 0) return <TrendingDown size={20} />;
    return <Clock size={20} />;
  };

  return (
    <Layout 
      title={detalhes ? `Banco de Horas - ${usuarioSelecionado?.nome}` : 'Banco de Horas'}
      subtitle={new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
    >
      {!detalhes && (
        <div className="flex gap-3 mb-6">
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

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
      ) : detalhes ? (
        // Detalhes do usuário
        <div className="space-y-6">
          <button
            onClick={voltarParaLista}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar para lista
          </button>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-white">
              <p className="text-sm text-slate-600 mb-2">Total Trabalhado</p>
              <p className="text-4xl font-bold text-blue-600">{detalhes.total_horas_trabalhadas}h</p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-slate-50 to-white">
              <p className="text-sm text-slate-600 mb-2">Total Esperado</p>
              <p className="text-4xl font-bold text-slate-600">{detalhes.total_horas_esperadas}h</p>
            </Card>
            <Card className={`p-6 bg-gradient-to-br ${getSaldoBg(detalhes.saldo_total)} to-white`}>
              <p className="text-sm text-slate-600 mb-2">Saldo</p>
              <div className={`text-4xl font-bold flex items-center gap-2 ${getSaldoColor(detalhes.saldo_total)}`}>
                {getSaldoIcon(detalhes.saldo_total)}
                {Math.abs(parseFloat(detalhes.saldo_total)).toFixed(2)}h
              </div>
            </Card>
          </div>

          {/* Tabela de Detalhes */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Data</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Trabalhadas</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Esperadas</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalhes.registros.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900">
                          {new Date(reg.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-blue-600">
                        {parseFloat(reg.hours_worked).toFixed(2)}h
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {parseFloat(reg.hours_expected).toFixed(2)}h
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1 font-bold ${getSaldoColor(reg.balance)}`}>
                          {getSaldoIcon(reg.balance)}
                          {parseFloat(reg.balance) > 0 ? '+' : ''}{parseFloat(reg.balance).toFixed(2)}h
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        // Lista de usuários
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Funcionário</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Cargo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Trabalhadas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Esperadas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Saldo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((usuario, idx) => (
                  <motion.tr
                    key={usuario.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {usuario.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{usuario.nome}</p>
                          <p className="text-sm text-slate-500">{usuario.matricula}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{usuario.cargo}</td>
                    <td className="px-6 py-4 font-semibold text-blue-600">
                      {parseFloat(usuario.total_horas_trabalhadas).toFixed(2)}h
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {parseFloat(usuario.total_horas_esperadas).toFixed(2)}h
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1 font-bold ${getSaldoColor(usuario.saldo_total)}`}>
                        {getSaldoIcon(usuario.saldo_total)}
                        {parseFloat(usuario.saldo_total) > 0 ? '+' : ''}{parseFloat(usuario.saldo_total).toFixed(2)}h
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => verDetalhes(usuario.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Ver Detalhes
                        <ChevronRight size={16} />
                      </button>
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