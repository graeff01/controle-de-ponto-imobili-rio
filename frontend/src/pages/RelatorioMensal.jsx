import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download, TrendingUp } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/common/Button';
import api from '../services/api';
import * as XLSX from 'xlsx';

export default function RelatorioMensal() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const response = await api.get('/users');
      setUsuarios(response.data.data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const gerarRelatorio = async () => {
    if (!usuarioSelecionado) {
      alert('Selecione um funcionário');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/reports/monthly/${usuarioSelecionado}/${ano}/${mes}`);
      setRelatorio(response.data.data);
    } catch (err) {
      alert('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (!relatorio) return;

    const dados = relatorio.detalhes.map(d => ({
      'Data': new Date(d.date).toLocaleDateString('pt-BR'),
      'Entrada': d.entrada ? new Date(d.entrada).toLocaleTimeString('pt-BR') : '-',
      'Saída Intervalo': d.saida_intervalo ? new Date(d.saida_intervalo).toLocaleTimeString('pt-BR') : '-',
      'Retorno Intervalo': d.retorno_intervalo ? new Date(d.retorno_intervalo).toLocaleTimeString('pt-BR') : '-',
      'Saída Final': d.saida_final ? new Date(d.saida_final).toLocaleTimeString('pt-BR') : '-',
      'Horas': d.hours_worked || '0',
      'Status': d.status_dia
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio_${mes}_${ano}.xlsx`);
  };

  const usuario = usuarios.find(u => u.id === usuarioSelecionado);

  return (
    <Layout title="Relatório Mensal" subtitle="Análise completa de horas e registros">
      
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Selecionar Período</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Funcionário</label>
            <select
              value={usuarioSelecionado}
              onChange={(e) => setUsuarioSelecionado(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            >
              <option value="">Selecione...</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nome} - {u.matricula}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ano</label>
            <select
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={gerarRelatorio} fullWidth disabled={loading}>
            <Calendar className="inline mr-2" size={20} />
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </div>
      </Card>

      {relatorio && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-white">
              <p className="text-sm text-slate-600 mb-1">Total de Horas</p>
              <p className="text-4xl font-bold text-blue-600">{relatorio.resumo.total_horas}h</p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-white">
              <p className="text-sm text-slate-600 mb-1">Dias Completos</p>
              <p className="text-4xl font-bold text-emerald-600">{relatorio.resumo.dias_completos}</p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-white">
              <p className="text-sm text-slate-600 mb-1">Dias Incompletos</p>
              <p className="text-4xl font-bold text-amber-600">{relatorio.resumo.dias_incompletos}</p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-red-50 to-white">
              <p className="text-sm text-slate-600 mb-1">Ausências</p>
              <p className="text-4xl font-bold text-red-600">{relatorio.resumo.ausencias}</p>
            </Card>
          </div>

          {/* Header da Tabela */}
          <Card className="p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Detalhes - {usuario?.nome}</h3>
                <p className="text-sm text-slate-500">
                  {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <Button onClick={exportarExcel} variant="secondary">
                <Download className="inline mr-2" size={20} />
                Exportar Excel
              </Button>
            </div>
          </Card>

          {/* Tabela */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Data</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Entrada</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Saída Int.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Retorno Int.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Saída Final</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Horas</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relatorio.detalhes.map((dia, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {new Date(dia.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {dia.entrada ? new Date(dia.entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {dia.saida_intervalo ? new Date(dia.saida_intervalo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {dia.retorno_intervalo ? new Date(dia.retorno_intervalo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {dia.saida_final ? new Date(dia.saida_final).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-blue-600">
                        {dia.hours_worked || '0h'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          dia.status_dia === 'Completo' ? 'success' :
                          dia.status_dia === 'Incompleto' ? 'warning' : 'danger'
                        }>
                          {dia.status_dia}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </Layout>
  );
}