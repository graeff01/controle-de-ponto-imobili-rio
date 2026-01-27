import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, Eye, Filter, Calendar, User, Clock as ClockIcon } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/common/Input';
import api from '../services/api';
import * as XLSX from 'xlsx';

export default function Registros() {
  const [registrosCLT, setRegistrosCLT] = useState([]);
  const [registrosPlantonistas, setRegistrosPlantonistas] = useState([]);
  const [registrosCLTFiltrados, setRegistrosCLTFiltrados] = useState([]);
  const [registrosPlantonistasFiltrados, setRegistrosPlantonistasFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fotoModal, setFotoModal] = useState(null);

  const [filtroData, setFiltroData] = useState('hoje');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    carregarRegistros();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [registrosCLT, registrosPlantonistas, filtroData, dataInicio, dataFim, filtroNome, filtroTipo]);

  const carregarRegistros = async () => {
    setLoading(true);
    try {
      const response = await api.get('/time-records/all');
      setRegistrosCLT(response.data.data.clt);
      setRegistrosPlantonistas(response.data.data.plantonistas);
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
    } finally {
      setLoading(false);
    }
  };

  const verFoto = (registro) => {
    const fotoData = registro.photo_data || registro.photo;
    if (fotoData) {
      setFotoModal(`data:image/jpeg;base64,${fotoData}`);
    } else {
      alert('Este registro não possui foto');
    }
  };

  const aplicarFiltros = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const filtrarPorData = (registros) => {
      let filtered = [...registros];

      if (filtroData === 'hoje') {
        filtered = filtered.filter(r => {
          const data = new Date(r.timestamp);
          data.setHours(0, 0, 0, 0);
          return data.getTime() === hoje.getTime();
        });
      } else if (filtroData === 'ontem') {
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        filtered = filtered.filter(r => {
          const data = new Date(r.timestamp);
          data.setHours(0, 0, 0, 0);
          return data.getTime() === ontem.getTime();
        });
      } else if (filtroData === 'semana') {
        const semanaAtras = new Date(hoje);
        semanaAtras.setDate(semanaAtras.getDate() - 7);
        filtered = filtered.filter(r => new Date(r.timestamp) >= semanaAtras);
      } else if (filtroData === 'customizado' && dataInicio && dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59);
        filtered = filtered.filter(r => {
          const data = new Date(r.timestamp);
          return data >= inicio && data <= fim;
        });
      }

      if (filtroNome) {
        filtered = filtered.filter(r =>
          r.nome.toLowerCase().includes(filtroNome.toLowerCase()) ||
          r.matricula.includes(filtroNome)
        );
      }

      return filtered;
    };

    // Filtrar CLT
    let filteredCLT = filtrarPorData(registrosCLT);
    if (filtroTipo !== 'todos' && filtroTipo !== 'presenca') {
      filteredCLT = filteredCLT.filter(r => r.record_type === filtroTipo);
    } else if (filtroTipo === 'presenca') {
      filteredCLT = [];
    }

    // Filtrar Plantonistas
    let filteredPlantonistas = filtrarPorData(registrosPlantonistas);
    if (filtroTipo !== 'todos' && filtroTipo !== 'presenca') {
      filteredPlantonistas = [];
    }

    setRegistrosCLTFiltrados(filteredCLT);
    setRegistrosPlantonistasFiltrados(filteredPlantonistas);
  };

  const exportarExcel = () => {
    const dadosCLT = registrosCLTFiltrados.map(r => ({
      'Tipo': 'Funcionário CLT',
      'Data': new Date(r.timestamp).toLocaleDateString('pt-BR'),
      'Horário': new Date(r.timestamp).toLocaleTimeString('pt-BR'),
      'Nome': r.nome,
      'Matrícula': r.matricula,
      'Cargo': r.cargo,
      'Registro': getTipoLabel(r.record_type)
    }));

    const dadosPlantonistas = registrosPlantonistasFiltrados.map(r => ({
      'Tipo': 'Plantonista PJ',
      'Data': new Date(r.timestamp).toLocaleDateString('pt-BR'),
      'Horário': new Date(r.timestamp).toLocaleTimeString('pt-BR'),
      'Nome': r.nome,
      'Matrícula': r.matricula,
      'Cargo': r.cargo,
      'Registro': 'Presença Plantão'
    }));

    const todosRegistros = [...dadosCLT, ...dadosPlantonistas];

    const ws = XLSX.utils.json_to_sheet(todosRegistros);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    XLSX.writeFile(wb, `registros_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      entrada: 'Entrada',
      saida_intervalo: 'Saída Intervalo',
      retorno_intervalo: 'Retorno Intervalo',
      saida_final: 'Saída Final',
      presenca: 'Presença Plantão'
    };
    return tipos[tipo] || tipo;
  };

  const getTipoVariant = (tipo) => {
    const variants = {
      entrada: 'success',
      saida_intervalo: 'warning',
      retorno_intervalo: 'info',
      saida_final: 'danger',
      presenca: 'purple'
    };
    return variants[tipo] || 'default';
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      entrada: '✅',
      saida_intervalo: '⏸️',
      retorno_intervalo: '▶️',
      saida_final: '🚪',
      presenca: '📋'
    };
    return icons[tipo] || '⚪';
  };

  const totalRegistros = registrosCLTFiltrados.length + registrosPlantonistasFiltrados.length;

  return (
    <Layout title="Registros de Ponto" subtitle={`${totalRegistros} registro(s) encontrado(s)`}>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className={`
            px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2
            ${mostrarFiltros
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }
          `}
        >
          <Filter size={18} />
          Filtros
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={exportarExcel}
          className="px-4 py-2.5 rounded-xl font-medium bg-white text-slate-700 border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-2"
        >
          <Download size={18} />
          Exportar Excel
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={carregarRegistros}
          className="px-4 py-2.5 rounded-xl font-medium bg-white text-slate-700 border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Atualizar
        </motion.button>
      </div>

      {/* Filtros */}
      <AnimatePresence>
        {mostrarFiltros && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Período</label>
                  <select
                    value={filtroData}
                    onChange={(e) => setFiltroData(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all"
                  >
                    <option value="hoje">Hoje</option>
                    <option value="ontem">Ontem</option>
                    <option value="semana">Última Semana</option>
                    <option value="customizado">Personalizado</option>
                  </select>
                </div>

                {filtroData === 'customizado' && (
                  <>
                    <Input
                      label="Data Início"
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                    <Input
                      label="Data Fim"
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </>
                )}

                <Input
                  label="Buscar (Nome/Matrícula)"
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  placeholder="Digite para buscar..."
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all"
                  >
                    <option value="todos">Todos</option>
                    <option value="entrada">Entrada</option>
                    <option value="saida_intervalo">Saída Intervalo</option>
                    <option value="retorno_intervalo">Retorno Intervalo</option>
                    <option value="saida_final">Saída Final</option>
                    <option value="presenca">📋 Presença Plantão</option>
                  </select>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
        <div className="space-y-6">

          {registrosCLTFiltrados.length > 0 && (
            <Card className="overflow-hidden border-none shadow-premium">
              <div className="bg-white border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900 rounded-lg shadow-lg">
                    <User size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-lg tracking-tight">
                      Funcionários CLT
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Registros de equipe interna</p>
                  </div>
                  <div className="ml-auto">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                      {registrosCLTFiltrados.length} Registros
                    </span>
                  </div>
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
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Foto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrosCLTFiltrados.map((registro, idx) => (
                      <motion.tr
                        key={registro.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-semibold">
                              {registro.nome.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{registro.nome}</p>
                              <p className="text-sm text-slate-500">{registro.matricula} • {registro.cargo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getTipoVariant(registro.record_type)}>
                            {getTipoIcon(registro.record_type)} {getTipoLabel(registro.record_type)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="font-medium">{new Date(registro.timestamp).toLocaleDateString('pt-BR')}</span>
                            <ClockIcon size={16} className="text-slate-400 ml-2" />
                            <span>{new Date(registro.timestamp).toLocaleTimeString('pt-BR')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => verFoto(registro)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                            title="Ver foto"
                          >
                            <Eye size={18} className="text-slate-400 group-hover:text-slate-900" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ========== REGISTROS PLANTONISTAS ========== */}
          {registrosPlantonistasFiltrados.length > 0 && (
            <Card className="overflow-hidden border-none shadow-premium mt-8">
              <div className="bg-white border-b border-blue-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
                    <ClockIcon size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-lg tracking-tight">
                      Plantonistas PJ
                    </h3>
                    <p className="text-xs text-blue-500 font-medium">Corretores em plantão de vendas</p>
                  </div>
                  <div className="ml-auto">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
                      {registrosPlantonistasFiltrados.length} Presenças
                    </span>
                  </div>
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
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        Foto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {registrosPlantonistasFiltrados.map((registro, idx) => (
                      <motion.tr
                        key={registro.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                              {registro.nome.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{registro.nome}</p>
                              <p className="text-sm text-blue-600 font-medium">{registro.matricula} • {registro.cargo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="warning">
                            📋 Presença Plantão
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="font-medium">{new Date(registro.timestamp).toLocaleDateString('pt-BR')}</span>
                            <ClockIcon size={16} className="text-slate-400 ml-2" />
                            <span>{new Date(registro.timestamp).toLocaleTimeString('pt-BR')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => verFoto(registro)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
                            title="Ver foto"
                          >
                            <Eye size={18} className="text-slate-400 group-hover:text-blue-700" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Mensagem quando não há registros */}
          {registrosCLTFiltrados.length === 0 && registrosPlantonistasFiltrados.length === 0 && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-slate-400" size={32} />
              </div>
              <p className="text-xl font-semibold text-slate-900 mb-2">Nenhum registro encontrado</p>
              <p className="text-slate-500">Tente ajustar os filtros ou aguarde novos registros</p>
            </Card>
          )}
        </div>
      )}

      {/* Modal de Foto */}
      <AnimatePresence>
        {fotoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setFotoModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-900">Foto do Registro</h3>
                <button
                  onClick={() => setFotoModal(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-slate-500">×</span>
                </button>
              </div>

              <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-center min-h-[400px]">
                <img
                  src={fotoModal}
                  alt="Foto do registro"
                  className="max-w-full max-h-[500px] rounded-lg shadow-lg"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FcnJvIGFvIGNhcnJlZ2FyIGltYWdlbTwvdGV4dD48L3N2Zz4=';
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}