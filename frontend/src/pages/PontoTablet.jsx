import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn,
  Coffee,
  PlayCircle,
  LogOut,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  User
} from 'lucide-react';
import api from '../services/api';

export default function Tablet() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [matricula, setMatricula] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [tipoRegistro, setTipoRegistro] = useState('entrada');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showCamera) {
      iniciarCamera();
    }
    return () => pararCamera();
  }, [showCamera]);

  const iniciarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1280, height: 720 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStream(stream);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
    }
  };

  const pararCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const buscarUsuario = async (mat) => {
    if (mat.length < 3) return;
    
    try {
      const response = await api.get(`/users/matricula/${mat}`);
      setUsuario(response.data.data);
      setShowCamera(true);
    } catch (err) {
      setUsuario(null);
      setShowCamera(false);
    }
  };

  useEffect(() => {
    if (matricula.length >= 3) {
      buscarUsuario(matricula);
    } else {
      setUsuario(null);
      setShowCamera(false);
    }
  }, [matricula]);

  const capturarFoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    }
    return null;
  };

  const registrarPonto = async () => {
    if (!usuario) {
      mostrarMensagem('error', 'Digite uma matrícula válida');
      return;
    }

    setLoading(true);
    try {
      const foto = capturarFoto();
      
      await api.post('/tablet/register', {
        matricula: matricula,
        record_type: tipoRegistro,
        photo: foto
      });

      mostrarMensagem('success', `${getTipoLabel(tipoRegistro)} registrado com sucesso`);
      pararCamera();
      setTimeout(() => {
        setMatricula('');
        setUsuario(null);
        setTipoRegistro('entrada');
        setShowCamera(false);
      }, 2000);
    } catch (err) {
      mostrarMensagem('error', err.response?.data?.error || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensagem = (tipo, texto) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 3000);
  };

  const getSaudacao = () => {
    const hora = horaAtual.getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      entrada: 'Entrada',
      saida_intervalo: 'Saída Intervalo',
      retorno_intervalo: 'Retorno Intervalo',
      saida_final: 'Saída Final'
    };
    return tipos[tipo] || tipo;
  };

  const tiposRegistro = [
    { value: 'entrada', label: 'Entrada', icon: LogIn, color: 'emerald' },
    { value: 'saida_intervalo', label: 'Saída Intervalo', icon: Coffee, color: 'amber' },
    { value: 'retorno_intervalo', label: 'Retorno Intervalo', icon: PlayCircle, color: 'blue' },
    { value: 'saida_final', label: 'Saída Final', icon: LogOut, color: 'slate' }
  ];

  const getColorClasses = (color, selected) => {
    if (selected) {
      const colors = {
        emerald: 'bg-emerald-600 text-white border-emerald-600',
        amber: 'bg-amber-600 text-white border-amber-600',
        blue: 'bg-blue-600 text-white border-blue-600',
        slate: 'bg-slate-600 text-white border-slate-600'
      };
      return colors[color];
    }
    return 'bg-white text-slate-700 border-slate-200 hover:border-slate-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header Corporativo */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center">
                <Clock className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sistema de Ponto</h1>
                <p className="text-slate-600">Registro de frequência</p>
              </div>
            </div>
            
            {/* Relógio */}
            <div className="text-right">
              <div className="text-4xl font-bold text-slate-900 tabular-nums">
                {horaAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className="text-sm text-slate-600">
                {horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
            </div>
          </div>
        </div>

        {/* Card Principal - CENTRALIZADO QUANDO SEM USUÁRIO */}
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mx-auto transition-all ${usuario ? 'max-w-4xl' : 'max-w-2xl'}`}>
          
          {/* Saudação (se tiver usuário) */}
          {usuario && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <User className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {getSaudacao()}, {usuario.nome.split(' ')[0]}
                  </p>
                  <p className="text-slate-600">{usuario.cargo}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Input Matrícula - CENTRALIZADO E GRANDE QUANDO SEM USUÁRIO */}
          <div className={`mb-6 ${!usuario ? 'text-center py-12' : ''}`}>
            <label className={`block font-semibold text-slate-700 mb-4 ${!usuario ? 'text-lg' : 'text-sm'}`}>
              Digite sua matrícula para começar
            </label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className={`px-6 py-4 text-center border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all ${
                !usuario 
                  ? 'w-full max-w-md mx-auto text-4xl font-bold' 
                  : 'w-full text-2xl'
              }`}
              placeholder="000000"
              autoFocus
            />
          </div>

          {/* Tipos de Registro */}
          {usuario && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Selecione o tipo de registro
              </label>
              <div className="grid grid-cols-2 gap-3">
                {tiposRegistro.map((tipo) => {
                  const Icon = tipo.icon;
                  const isSelected = tipoRegistro === tipo.value;
                  return (
                    <button
                      key={tipo.value}
                      onClick={() => setTipoRegistro(tipo.value)}
                      className={`
                        p-4 rounded-xl font-semibold border-2 transition-all
                        ${getColorClasses(tipo.color, isSelected)}
                      `}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Icon size={20} />
                        <span>{tipo.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Preview da Câmera */}
          {showCamera && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <div className="relative rounded-xl overflow-hidden border-2 border-slate-200">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover bg-slate-900"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </motion.div>
          )}

          {/* Botão Registrar */}
          {usuario && (
            <button
              onClick={registrarPonto}
              disabled={loading}
              className={`
                w-full py-5 rounded-xl font-bold text-lg transition-all
                ${!loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Camera size={20} />
                  Registrar Ponto
                </div>
              )}
            </button>
          )}

          {/* Link Gestor */}
          <div className={`pt-6 border-t border-slate-200 text-center ${usuario ? 'mt-6' : 'mt-8'}`}>
            <button
              onClick={() => navigate('/login')}
              className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
            >
              Acessar painel administrativo →
            </button>
          </div>
        </div>
      </div>

      {/* Mensagens de Feedback */}
      <AnimatePresence>
        {mensagem && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={`
              px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2
              ${mensagem.tipo === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
              }
            `}>
              {mensagem.tipo === 'success' ? (
                <CheckCircle size={24} />
              ) : (
                <XCircle size={24} />
              )}
              <div>
                <p className="font-bold">{mensagem.tipo === 'success' ? 'Sucesso' : 'Erro'}</p>
                <p className="text-sm">{mensagem.texto}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}