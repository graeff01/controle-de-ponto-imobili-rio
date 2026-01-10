import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import Button from '../components/common/Button';
import api from '../services/api';

export default function JornadaDiaria() {
  const navigate = useNavigate();
  const { userId, date } = useParams();
  const [usuario, setUsuario] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [horasTrabalhadas, setHorasTrabalhadas] = useState(null);

  useEffect(() => {
    carregarDados();
  }, [userId, date]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [userRes, recordsRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/time-records/user/${userId}?date=${date}`)
      ]);

      setUsuario(userRes.data.data);
      const records = recordsRes.data.data || [];
      setRegistros(records);
      calcularHoras(records);
    } catch (err) {
      console.error('Erro ao carregar jornada:', err);
    } finally {
      setLoading(false);
    }
  };

  const calcularHoras = (records) => {
    const entrada = records.find(r => r.record_type === 'entrada');
    const saidaFinal = records.find(r => r.record_type === 'saida_final');

    if (entrada && saidaFinal) {
      const diff = new Date(saidaFinal.timestamp) - new Date(entrada.timestamp);
      const horas = Math.floor(diff / 1000 / 60 / 60);
      const minutos = Math.floor((diff / 1000 / 60) % 60);
      setHorasTrabalhadas(`${horas}h ${minutos}min`);
    } else {
      setHorasTrabalhadas('Incompleto');
    }
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

  const getTipoIcon = (tipo) => {
    const icons = {
      entrada: '🟢',
      saida_intervalo: '🟡',
      retorno_intervalo: '🔵',
      saida_final: '🔴'
    };
    return icons[tipo] || '⚪';
  };

  const verificarInconsistencias = () => {
    const inconsistencias = [];
    
    const entrada = registros.find(r => r.record_type === 'entrada');
    const saidaFinal = registros.find(r => r.record_type === 'saida_final');
    const saidaIntervalo = registros.find(r => r.record_type === 'saida_intervalo');
    const retornoIntervalo = registros.find(r => r.record_type === 'retorno_intervalo');

    if (!entrada) inconsistencias.push('Falta registro de entrada');
    if (!saidaFinal) inconsistencias.push('Falta registro de saída final');
    if (saidaIntervalo && !retornoIntervalo) inconsistencias.push('Saiu para intervalo mas não retornou');
    if (!saidaIntervalo && retornoIntervalo) inconsistencias.push('Retornou do intervalo sem registro de saída');

    return inconsistencias;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  const inconsistencias = verificarInconsistencias();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/registros')}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Jornada Diária</h1>
              <p className="text-gray-600">
                {usuario?.nome} - {new Date(date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Resumo */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Resumo do Dia</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total de Registros</div>
              <div className="text-3xl font-bold text-blue-600">{registros.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Horas Trabalhadas</div>
              <div className="text-3xl font-bold text-green-600">{horasTrabalhadas}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Inconsistências</div>
              <div className="text-3xl font-bold text-orange-600">{inconsistencias.length}</div>
            </div>
          </div>
        </div>

        {/* Inconsistências */}
        {inconsistencias.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-center mb-2">
              <AlertCircle className="text-yellow-600 mr-2" size={20} />
              <h3 className="text-lg font-bold text-yellow-800">Atenção</h3>
            </div>
            <ul className="list-disc list-inside text-yellow-700">
              {inconsistencias.map((inc, i) => (
                <li key={i}>{inc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6">Timeline do Dia</h2>
          
          {registros.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum registro neste dia</p>
          ) : (
            <div className="space-y-4">
              {registros.map((registro, index) => (
                <div key={registro.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl">{getTipoIcon(registro.record_type)}</div>
                    {index < registros.length - 1 && (
                      <div className="w-0.5 h-16 bg-gray-300 my-2"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg">
                          {getTipoLabel(registro.record_type)}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center mt-1">
                          <Clock size={14} className="mr-1" />
                          {new Date(registro.timestamp).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                      
                      {registro.is_manual && (
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                          Manual
                        </span>
                      )}
                    </div>
                    
                    {index < registros.length - 1 && (
                      <div className="mt-2 text-sm text-gray-500">
                        ⏱️ Intervalo até próximo registro:{' '}
                        {(() => {
                          const diff = new Date(registros[index + 1].timestamp) - new Date(registro.timestamp);
                          const horas = Math.floor(diff / 1000 / 60 / 60);
                          const minutos = Math.floor((diff / 1000 / 60) % 60);
                          return `${horas}h ${minutos}min`;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button onClick={() => navigate('/registros')} fullWidth variant="secondary">
            Voltar para Registros
          </Button>
        </div>
      </main>
    </div>
  );
}