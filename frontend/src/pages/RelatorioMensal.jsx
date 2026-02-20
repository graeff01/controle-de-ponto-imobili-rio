import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Calendar, User, Users, Briefcase, FileText, Lock, Unlock } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import api from '../services/api';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';

export default function RelatorioMensal() {
  const { user } = useAuth();
  const [tipoRelatorio, setTipoRelatorio] = useState('individual');
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mesFechado, setMesFechado] = useState(false);
  const [fechamentoLoading, setFechamentoLoading] = useState(false);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    verificarFechamento();
  }, [mes, ano]);

  const carregarUsuarios = async () => {
    try {
      const response = await api.get('/users');
      setUsuarios(response.data.data);
      if (response.data.data.length > 0) {
        setUsuarioSelecionado(response.data.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const verificarFechamento = async () => {
    try {
      const response = await api.get(`/monthly-closing/status/${ano}/${mes}`);
      setMesFechado(response.data.data?.closed || false);
    } catch (err) {
      setMesFechado(false);
    }
  };

  const fecharMes = async () => {
    if (!confirm(`Tem certeza que deseja FECHAR o mês ${mes}/${ano}? Após o fechamento, ajustes e registros manuais neste período serão bloqueados.`)) return;
    setFechamentoLoading(true);
    try {
      await api.post('/monthly-closing/close', { year: ano, month: mes });
      setMesFechado(true);
      alert(`Mês ${mes}/${ano} fechado com sucesso!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao fechar mês');
    } finally {
      setFechamentoLoading(false);
    }
  };

  const reabrirMes = async () => {
    if (!confirm(`Tem certeza que deseja REABRIR o mês ${mes}/${ano}? Isso permitirá novos ajustes e registros.`)) return;
    setFechamentoLoading(true);
    try {
      await api.post('/monthly-closing/reopen', { year: ano, month: mes });
      setMesFechado(false);
      alert(`Mês ${mes}/${ano} reaberto!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao reabrir mês');
    } finally {
      setFechamentoLoading(false);
    }
  };

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      let response;

      if (tipoRelatorio === 'individual') {
        response = await api.get(`/reports/monthly/individual/${usuarioSelecionado}/${ano}/${mes}`);
      } else if (tipoRelatorio === 'clt') {
        response = await api.get(`/reports/monthly/clt/${ano}/${mes}`);
      } else {
        response = await api.get(`/reports/monthly/plantonistas/${ano}/${mes}`);
      }

      setRelatorio(response.data.data);
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      alert('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (!relatorio) return;

    const wb = XLSX.utils.book_new();

    if (tipoRelatorio === 'individual') {
      // Relatório Individual
      const dados = relatorio.registros.map(r => ({
        Data: new Date(r.data).toLocaleDateString('pt-BR'),
        Entrada: r.entrada ? new Date(r.entrada).toLocaleTimeString('pt-BR') : '-',
        'Saída Intervalo': r.saida_intervalo ? new Date(r.saida_intervalo).toLocaleTimeString('pt-BR') : '-',
        'Retorno Intervalo': r.retorno_intervalo ? new Date(r.retorno_intervalo).toLocaleTimeString('pt-BR') : '-',
        'Saída Final': r.saida_final ? new Date(r.saida_final).toLocaleTimeString('pt-BR') : '-',
        Presença: r.check_in ? new Date(r.check_in).toLocaleTimeString('pt-BR') : '-'
      }));

      const ws = XLSX.utils.json_to_sheet(dados);
      XLSX.utils.book_append_sheet(wb, ws, relatorio.usuario.nome);

    } else if (tipoRelatorio === 'clt') {
      // Relatório CLT
      relatorio.funcionarios.forEach(func => {
        const dados = func.detalhes.map(d => ({
          Data: new Date(d.data).toLocaleDateString('pt-BR'),
          Entrada: d.entrada ? new Date(d.entrada).toLocaleTimeString('pt-BR') : '-',
          'Saída Final': d.saida_final ? new Date(d.saida_final).toLocaleTimeString('pt-BR') : '-',
          Status: d.completo ? 'Completo' : 'Incompleto'
        }));

        const ws = XLSX.utils.json_to_sheet(dados);
        XLSX.utils.book_append_sheet(wb, ws, func.funcionario.nome.substring(0, 30));
      });

    } else {
      // Relatório Plantonistas
      relatorio.plantonistas.forEach(plant => {
        const dados = plant.detalhes.map(d => ({
          Data: new Date(d.data).toLocaleDateString('pt-BR'),
          Horário: new Date(d.horario).toLocaleTimeString('pt-BR')
        }));

        const ws = XLSX.utils.json_to_sheet(dados);
        XLSX.utils.book_append_sheet(wb, ws, plant.plantonista.nome.substring(0, 30));
      });
    }

    const nomeArquivo = `relatorio_${tipoRelatorio}_${mes}_${ano}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  const gerarPDFAssinado = async (signatureData) => {
    try {
      setLoading(true);
      const response = await api.post('/reports/signed-pdf', {
        userId: usuarioSelecionado,
        year: ano,
        month: mes,
        signature: signatureData
      }, {
        responseType: 'blob' // Important for PDF download
      });

      // Pegar nome do funcionário para o arquivo
      const nomeFunc = usuarios.find(u => String(u.id) === String(usuarioSelecionado))?.nome || 'funcionario';
      const nomeArquivo = `espelho_${nomeFunc.replace(/\s+/g, '_')}_${mes}_${ano}.pdf`;

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nomeArquivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      alert('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Layout title="Relatório Mensal" subtitle="Análise completa de horas e registros">

      <Card className="p-6 mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Selecionar Período</h3>

        {/* Tipo de Relatório */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Tipo de Relatório
          </label>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTipoRelatorio('individual')}
              className={`
                p-4 rounded-xl border-2 transition-all
                flex items-center gap-3
                ${tipoRelatorio === 'individual'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <User size={20} />
              <div className="text-left">
                <p className="font-semibold">Individual</p>
                <p className="text-xs opacity-75">Um funcionário</p>
              </div>
            </button>

            <button
              onClick={() => setTipoRelatorio('clt')}
              className={`
                p-4 rounded-xl border-2 transition-all
                flex items-center gap-3
                ${tipoRelatorio === 'clt'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <Users size={20} />
              <div className="text-left">
                <p className="font-semibold">Todos CLT</p>
                <p className="text-xs opacity-75">Funcionários</p>
              </div>
            </button>

            <button
              onClick={() => setTipoRelatorio('plantonistas')}
              className={`
                p-4 rounded-xl border-2 transition-all
                flex items-center gap-3
                ${tipoRelatorio === 'plantonistas'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <Briefcase size={20} />
              <div className="text-left">
                <p className="font-semibold">📋 Plantonistas</p>
                <p className="text-xs opacity-75">Corretores PJ</p>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Funcionário (só aparece se Individual) */}
          {tipoRelatorio === 'individual' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Funcionário
              </label>
              <select
                value={usuarioSelecionado}
                onChange={(e) => setUsuarioSelecionado(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 outline-none transition-all"
              >
                {usuarios.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nome} - {user.matricula}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mês */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Mês
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 outline-none transition-all capitalize"
            >
              {meses.map((m, idx) => (
                <option key={idx} value={idx + 1} className="capitalize">{m}</option>
              ))}
            </select>
          </div>

          {/* Ano */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Ano
            </label>
            <select
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value))}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 outline-none transition-all"
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicador de mês fechado */}
        {mesFechado && (
          <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-center gap-3">
            <Lock size={20} className="text-amber-600" />
            <div>
              <p className="font-bold text-amber-800">Mês fechado</p>
              <p className="text-sm text-amber-600">Ajustes e registros manuais estão bloqueados para este período.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={gerarRelatorio}
            disabled={loading}
            className="
              flex-1 bg-slate-800 hover:bg-slate-700
              disabled:bg-slate-300 disabled:cursor-not-allowed
              text-white font-bold py-3 rounded-xl
              flex items-center justify-center gap-2
              transition-all
            "
          >
            <Calendar size={20} />
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </motion.button>

          {relatorio && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportarExcel}
              className="
                px-6 bg-emerald-600 hover:bg-emerald-700
                text-white font-bold py-3 rounded-xl
                flex items-center gap-2
                transition-all
              "
            >
              <Download size={20} />
              Excel
            </motion.button>
          )}

          {tipoRelatorio === 'individual' && usuarioSelecionado && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => gerarPDFAssinado(null)}
              disabled={loading}
              className="
                px-6 bg-red-600 hover:bg-red-700 disabled:bg-slate-300
                text-white font-bold py-3 rounded-xl
                flex items-center gap-2
                transition-all
              "
            >
              <FileText size={20} />
              {loading ? 'Gerando...' : 'Baixar Espelho PDF'}
            </motion.button>
          )}

          {/* Botão de Fechamento/Reabertura (apenas admin) */}
          {user?.role === 'admin' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={mesFechado ? reabrirMes : fecharMes}
              disabled={fechamentoLoading}
              className={`
                px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all
                ${mesFechado
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {mesFechado ? <Unlock size={20} /> : <Lock size={20} />}
              {fechamentoLoading ? 'Processando...' : mesFechado ? 'Reabrir Mês' : 'Fechar Mês'}
            </motion.button>
          )}
        </div>
      </Card>

      {/* Preview do Relatório */}
      {relatorio && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">
              Resultado do Relatório
            </h3>
            <span className="text-sm text-slate-500 capitalize">
              {meses[mes - 1]} / {ano}
            </span>
          </div>

          {tipoRelatorio === 'individual' && (
            <div>
              <div className="bg-slate-50 p-4 rounded-xl mb-4">
                <p className="font-bold text-slate-900">{relatorio.usuario.nome}</p>
                <p className="text-sm text-slate-600">{relatorio.usuario.matricula} • {relatorio.usuario.cargo}</p>
              </div>
              <p className="text-slate-600">Total de {relatorio.registros.length} registro(s)</p>
            </div>
          )}

          {tipoRelatorio === 'clt' && (
            <div>
              <p className="text-slate-600 mb-4">
                {relatorio.funcionarios.length} funcionário(s) CLT
              </p>
              <div className="space-y-2">
                {relatorio.funcionarios.map((func, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg flex justify-between">
                    <span className="font-medium">{func.funcionario.nome}</span>
                    <span className="text-slate-600">{func.dias_trabalhados} dias trabalhados</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tipoRelatorio === 'plantonistas' && (
            <div>
              <p className="text-slate-600 mb-4">
                {relatorio.plantonistas.length} plantonista(s)
              </p>
              <div className="space-y-2">
                {relatorio.plantonistas.map((plant, idx) => (
                  <div key={idx} className="bg-blue-50 p-3 rounded-lg flex justify-between">
                    <span className="font-medium">{plant.plantonista.nome}</span>
                    <span className="text-blue-700">📋 {plant.total_presencas} presenças</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </Layout>
  );
}