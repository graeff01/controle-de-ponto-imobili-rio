import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, LogIn, Coffee, RotateCcw, LogOut, Clock, User, Building2 } from 'lucide-react';
import api from '../services/api';

export default function Tablet() {
  const [matricula, setMatricula] = useState('');
  const [userData, setUserData] = useState(null);
  const [recordType, setRecordType] = useState('entrada');
  const [photo, setPhoto] = useState(null);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showCamera && !stream) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera]);

  // ✅ BUSCAR USUÁRIO AUTOMATICAMENTE QUANDO DIGITA
  useEffect(() => {
    if (matricula.length >= 3) {
      buscarUsuario();
    } else {
      setUserData(null);
      setShowCamera(false);
    }
  }, [matricula]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      showMessage('Erro ao acessar a câmera', 'error');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);
      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(photoData);
    }
  };

  // ✅ USAR A ROTA QUE FUNCIONA
  const buscarUsuario = async () => {
    if (matricula.length < 3) return;
    
    try {
      const response = await api.get(`/users/matricula/${matricula}`);
      setUserData(response.data.data);
      setShowCamera(true);
    } catch (err) {
      setUserData(null);
      setShowCamera(false);
    }
  };

  const registrarPonto = async () => {
    if (!userData) {
      showMessage('Digite uma matrícula válida', 'error');
      return;
    }

    if (!photo) {
      showMessage('Capture uma foto antes de registrar', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/tablet/register', {
        matricula: userData.matricula,
        record_type: recordType,
        photo
      });
      
      showMessage('Ponto registrado com sucesso!', 'success');
      
      setTimeout(() => {
        resetForm();
      }, 2000);
      
    } catch (err) {
      showMessage(err.response?.data?.error || 'Erro ao registrar ponto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMatricula('');
    setUserData(null);
    setRecordType('entrada');
    setPhoto(null);
    setShowCamera(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long' 
    });
  };

  const getSaudacao = () => {
    const hora = currentTime.getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        
        {/* Mensagens */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`
                fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl
                ${message.type === 'success' 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-red-500 text-white'
                }
              `}
            >
              <p className="font-semibold">{message.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center">
                <Clock className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sistema de Ponto</h1>
                <p className="text-slate-600">Registro de frequência</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-4xl font-bold text-slate-900 tabular-nums">
                {formatTime(currentTime)}
              </div>
              <p className="text-sm text-slate-600 capitalize">
                {formatDate(currentTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mx-auto transition-all ${userData ? 'max-w-4xl' : 'max-w-2xl'}`}>
          
          {/* Saudação */}
          {userData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 rounded-2xl p-6 mb-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {userData.nome.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {getSaudacao()}, {userData.nome.split(' ')[0]}
                  </p>
                  <p className="text-slate-600">{userData.cargo}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Input Matrícula */}
          <div className={`mb-6 ${!userData ? 'text-center py-12' : ''}`}>
            <label className={`block font-semibold text-slate-700 mb-4 ${!userData ? 'text-lg' : 'text-sm'}`}>
              Digite sua matrícula para começar
            </label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value.toUpperCase())}
              placeholder="000000"
              maxLength={10}
              className={`
                px-6 py-4 text-center font-bold
                bg-slate-50 border-2 border-slate-200
                focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10
                rounded-2xl outline-none transition-all
                placeholder:text-slate-300
                ${!userData 
                  ? 'w-full max-w-md mx-auto text-4xl tracking-wider' 
                  : 'w-full text-2xl'
                }
              `}
              autoFocus
            />
          </div>

          {/* Tipo de Registro */}
          {userData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Selecione o tipo de registro
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRecordType('entrada')}
                  className={`
                    px-6 py-4 rounded-xl font-semibold
                    border-2 transition-all duration-200
                    flex items-center justify-center gap-2
                    ${recordType === 'entrada'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <LogIn size={20} />
                  Entrada
                </button>
                <button
                  onClick={() => setRecordType('saida_intervalo')}
                  className={`
                    px-6 py-4 rounded-xl font-semibold
                    border-2 transition-all duration-200
                    flex items-center justify-center gap-2
                    ${recordType === 'saida_intervalo'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <Coffee size={20} />
                  Saída Intervalo
                </button>
                <button
                  onClick={() => setRecordType('retorno_intervalo')}
                  className={`
                    px-6 py-4 rounded-xl font-semibold
                    border-2 transition-all duration-200
                    flex items-center justify-center gap-2
                    ${recordType === 'retorno_intervalo'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <RotateCcw size={20} />
                  Retorno Intervalo
                </button>
                <button
                  onClick={() => setRecordType('saida_final')}
                  className={`
                    px-6 py-4 rounded-xl font-semibold
                    border-2 transition-all duration-200
                    flex items-center justify-center gap-2
                    ${recordType === 'saida_final'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <LogOut size={20} />
                  Saída Final
                </button>
              </div>
            </motion.div>
          )}

          {/* Webcam Preview */}
          {showCamera && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner">
                {photo ? (
                  <img src={photo} alt="Preview" className="w-full" />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
                
                {photo && (
                  <button
                    onClick={() => setPhoto(null)}
                    className="
                      absolute top-4 right-4
                      bg-slate-800/90 hover:bg-slate-700
                      text-white px-4 py-2 rounded-lg
                      font-semibold transition-all duration-200
                    "
                  >
                    ✕ Remover
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Botões de Ação */}
          {userData && (
            <>
              {!photo ? (
                <button
                  onClick={capturePhoto}
                  className="
                    w-full bg-slate-800 hover:bg-slate-700
                    text-white font-bold text-lg
                    rounded-2xl px-8 py-5 mb-3
                    shadow-lg hover:shadow-xl
                    transform hover:scale-[1.02]
                    transition-all duration-200
                    flex items-center justify-center gap-3
                  "
                >
                  <Camera size={24} />
                  Capturar Foto
                </button>
              ) : (
                <button
                  onClick={registrarPonto}
                  disabled={loading}
                  className="
                    w-full bg-emerald-600 hover:bg-emerald-700
                    disabled:bg-slate-300 disabled:cursor-not-allowed
                    text-white font-bold text-lg
                    rounded-2xl px-8 py-5 mb-3
                    shadow-lg hover:shadow-xl
                    transform hover:scale-[1.02]
                    transition-all duration-200
                    flex items-center justify-center gap-3
                  "
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-3 border-white border-t-transparent rounded-full"
                      />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Camera size={24} />
                      Registrar Ponto
                    </>
                  )}
                </button>
              )}

              <button
                onClick={resetForm}
                className="
                  w-full bg-white hover:bg-slate-50
                  text-slate-700 font-semibold
                  border-2 border-slate-200
                  rounded-2xl px-6 py-3
                  transition-all duration-200
                "
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}