import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, CheckCircle, Clock, ArrowLeft, PenTool, Trash2 } from 'lucide-react';
import ReactSignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

const meses = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function EspelhoPonto() {
  const [step, setStep] = useState('matricula'); // matricula | espelho | assinatura | sucesso
  const [matricula, setMatricula] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [espelho, setEspelho] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const sigCanvas = useRef({});
  const [sigEmpty, setSigEmpty] = useState(true);

  const verificarMatricula = async () => {
    if (!matricula.trim()) {
      setError('Digite sua matrícula');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/espelho/verificar', { matricula: matricula.trim() });
      setUsuario(res.data.data);
      // Carregar espelho automaticamente
      await carregarEspelho(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Matrícula não encontrada');
    } finally {
      setLoading(false);
    }
  };

  const carregarEspelho = async (usr = usuario) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/espelho/visualizar', {
        matricula: matricula.trim(),
        year: ano,
        month: mes
      });
      setEspelho(res.data.data);
      setStep('espelho');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar espelho');
    } finally {
      setLoading(false);
    }
  };

  const abrirAssinatura = () => {
    setSigEmpty(true);
    setStep('assinatura');
  };

  const assinar = async () => {
    if (sigEmpty) return;
    const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    setLoading(true);
    setError('');
    try {
      await api.post('/espelho/assinar', {
        matricula: matricula.trim(),
        year: ano,
        month: mes,
        signature: signatureData
      });
      setStep('sucesso');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao assinar');
    } finally {
      setLoading(false);
    }
  };

  const voltar = () => {
    if (step === 'assinatura') setStep('espelho');
    else if (step === 'espelho') {
      setStep('matricula');
      setEspelho(null);
      setUsuario(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-slate-800 text-white py-6 px-4 text-center shadow-lg">
        <h1 className="text-2xl font-bold">Espelho de Ponto</h1>
        <p className="text-slate-300 text-sm mt-1">Imobiliaria Jardim do Lago</p>
      </div>

      <div className="max-w-2xl mx-auto p-4 mt-6">
        <AnimatePresence mode="wait">

          {/* STEP 1: Matrícula */}
          {step === 'matricula' && (
            <motion.div
              key="matricula"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={28} className="text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Consulte seu Espelho de Ponto</h2>
                <p className="text-slate-500 text-sm mt-2">Digite sua matrícula para visualizar e assinar</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Matrícula</label>
                  <input
                    type="text"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verificarMatricula()}
                    placeholder="Ex: 001"
                    className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-center text-2xl font-bold focus:border-slate-800 outline-none transition-all"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Mês</label>
                    <select
                      value={mes}
                      onChange={(e) => setMes(parseInt(e.target.value))}
                      className="w-full px-3 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 outline-none"
                    >
                      {meses.slice(1).map((m, idx) => (
                        <option key={idx} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Ano</label>
                    <select
                      value={ano}
                      onChange={(e) => setAno(parseInt(e.target.value))}
                      className="w-full px-3 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 outline-none"
                    >
                      {[2026, 2025, 2024].map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm text-center">
                    {error}
                  </div>
                )}

                <button
                  onClick={verificarMatricula}
                  disabled={loading}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition-all text-lg"
                >
                  {loading ? 'Buscando...' : 'Consultar Espelho'}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Espelho */}
          {step === 'espelho' && espelho && (
            <motion.div
              key="espelho"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Info do funcionário */}
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
                <div className="flex items-center justify-between">
                  <button onClick={voltar} className="p-2 hover:bg-slate-100 rounded-lg">
                    <ArrowLeft size={20} className="text-slate-600" />
                  </button>
                  <div className="text-center flex-1">
                    <h2 className="text-lg font-bold text-slate-800">{espelho.usuario.nome}</h2>
                    <p className="text-sm text-slate-500">{espelho.usuario.cargo} - Mat: {espelho.usuario.matricula}</p>
                  </div>
                  <div className="w-10" />
                </div>
                <div className="text-center mt-2">
                  <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-4 py-1 rounded-full">
                    {meses[espelho.periodo.mes]} / {espelho.periodo.ano}
                  </span>
                </div>
              </div>

              {/* Tabela de registros */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="py-3 px-2 text-left">Data</th>
                        <th className="py-3 px-2">Dia</th>
                        <th className="py-3 px-2">Entrada</th>
                        <th className="py-3 px-2">S.Int</th>
                        <th className="py-3 px-2">R.Int</th>
                        <th className="py-3 px-2">Saida</th>
                        <th className="py-3 px-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {espelho.registros.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Nenhum registro encontrado neste periodo
                          </td>
                        </tr>
                      ) : (
                        espelho.registros.map((reg, idx) => {
                          const isFds = reg.dia_semana === 'Sab' || reg.dia_semana === 'Dom';
                          return (
                            <tr
                              key={idx}
                              className={`border-b border-slate-100 ${isFds ? 'bg-slate-50' : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}`}
                            >
                              <td className="py-2 px-2 font-medium">{new Date(reg.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                              <td className={`py-2 px-2 text-center ${isFds ? 'font-bold text-slate-400' : ''}`}>{reg.dia_semana}</td>
                              <td className="py-2 px-2 text-center">{reg.entrada || '--:--'}</td>
                              <td className="py-2 px-2 text-center">{reg.saida_intervalo || '--:--'}</td>
                              <td className="py-2 px-2 text-center">{reg.retorno_intervalo || '--:--'}</td>
                              <td className="py-2 px-2 text-center">{reg.saida_final || '--:--'}</td>
                              <td className="py-2 px-2 text-center font-semibold">{reg.horas}h</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
                <h3 className="font-bold text-slate-800 mb-3">Resumo do Mes</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-slate-800">{espelho.resumo.total_horas}h</p>
                    <p className="text-xs text-slate-500">Total Horas</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{espelho.resumo.dias_completos}</p>
                    <p className="text-xs text-green-600">Dias Completos</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{espelho.resumo.dias_incompletos}</p>
                    <p className="text-xs text-amber-600">Incompletos</p>
                  </div>
                </div>
              </div>

              {/* Botão de assinar */}
              {espelho.assinatura?.assinado ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                  <CheckCircle size={40} className="text-green-600 mx-auto mb-3" />
                  <p className="font-bold text-green-800 text-lg">Espelho ja assinado</p>
                  <p className="text-sm text-green-600 mt-1">
                    Assinado em: {new Date(espelho.assinatura.data_assinatura).toLocaleString('pt-BR')}
                  </p>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={abrirAssinatura}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-lg"
                >
                  <PenTool size={24} />
                  Assinar Espelho de Ponto
                </motion.button>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: Assinatura */}
          {step === 'assinatura' && (
            <motion.div
              key="assinatura"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <button onClick={voltar} className="p-2 hover:bg-slate-100 rounded-lg">
                  <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Assinatura</h2>
                  <p className="text-sm text-slate-500">{espelho?.usuario.nome} - {meses[espelho?.periodo.mes]} / {espelho?.periodo.ano}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Declaracao de Conformidade</p>
                <p>Ao assinar, declaro que as informacoes do espelho de ponto acima sao veridicas e refletem fielmente minha jornada de trabalho.</p>
              </div>

              <p className="text-sm text-slate-500 text-center mb-2">Faca sua rubrica no quadro abaixo:</p>

              <div className="border-2 border-slate-300 rounded-xl bg-white shadow-inner overflow-hidden mx-auto" style={{ maxWidth: 460 }}>
                <ReactSignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{
                    width: 450,
                    height: 200,
                    className: 'signature-canvas w-full'
                  }}
                  onBegin={() => setSigEmpty(false)}
                />
              </div>

              <div className="flex justify-between mt-4 gap-3">
                <button
                  onClick={() => { sigCanvas.current.clear(); setSigEmpty(true); }}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium"
                >
                  <Trash2 size={18} />
                  Limpar
                </button>

                <button
                  onClick={assinar}
                  disabled={sigEmpty || loading}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white text-lg transition-all
                    ${sigEmpty || loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'}
                  `}
                >
                  <CheckCircle size={22} />
                  {loading ? 'Enviando...' : 'Confirmar Assinatura'}
                </button>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: Sucesso */}
          {step === 'sucesso' && (
            <motion.div
              key="sucesso"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Assinatura Registrada!</h2>
              <p className="text-slate-600 mb-2">
                Seu espelho de ponto de <strong>{meses[espelho?.periodo.mes]} / {espelho?.periodo.ano}</strong> foi assinado com sucesso.
              </p>
              <p className="text-sm text-slate-400 mb-6">
                Registrado em {new Date().toLocaleString('pt-BR')}
              </p>

              <button
                onClick={() => {
                  setStep('matricula');
                  setMatricula('');
                  setUsuario(null);
                  setEspelho(null);
                  setError('');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
              >
                Voltar ao Inicio
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-slate-400">
        Sistema de Ponto - Imobiliaria Jardim do Lago
      </div>
    </div>
  );
}
