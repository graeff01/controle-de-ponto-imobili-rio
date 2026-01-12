import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, LogIn, Coffee, RotateCcw, LogOut, Clock, User, Building2 } from 'lucide-react';
import api from '../services/api';

export default function Tablet() {
  const [step, setStep] = useState('matricula');
  const [matricula, setMatricula] = useState('');
  const [userData, setUserData] = useState(null);
  const [recordType, setRecordType] = useState('entrada');
  const [photo, setPhoto] = useState(null);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step === 'registro' && !stream) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

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

  const buscarFuncionario = async (e) => {
    e.preventDefault();
    
    if (!matricula || matricula.length < 6) {
      showMessage('Digite uma matrícula válida', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/tablet/identify', { matricula });
      setUserData(response.data.data);
      setStep('registro');
    } catch (err) {
      showMessage(err.response?.data?.error || 'Matrícula não encontrada', 'error');
      setMatricula('');
    } finally {
      setLoading(false);
    }
  };

  const registrarPonto = async () => {
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
    setStep('matricula');
    setMatricula('');
    setUserData(null);
    setRecordType('entrada');
    setPhoto(null);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      
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

      <div className="w-full max-w-2xl">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center">
                <Clock className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sistema de Ponto</h1>
                <p className="text-slate-500">Registro de frequência</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-slate-900">{formatTime(currentTime)}</p>
              <p className="text-sm text-slate-500 capitalize">{formatDate(currentTime)}</p>
            </div>
          </div>
        </motion.div>

        {/* Conteúdo Principal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <AnimatePresence mode="wait">
            
            {/* TELA 1: Input Matrícula */}
            {step === 'matricula' && (
              <motion.div
                key="matricula"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-12"
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User className="text-slate-700" size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Digite sua matrícula para começar
                  </h2>
                </div>

                <form onSubmit={buscarFuncionario} className="space-y-6">
                  <input
                    type="text"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                    placeholder="000000"
                    maxLength={10}
                    className="
                      w-full text-4xl text-center font-bold tracking-wider
                      bg-slate-50 border-2 border-slate-200
                      focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10
                      rounded-2xl px-8 py-6
                      transition-all duration-200
                      placeholder:text-slate-300
                      outline-none
                    "
                    disabled={loading}
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={loading || matricula.length < 6}
                    className="
                      w-full bg-slate-800 hover:bg-slate-700
                      disabled:bg-slate-300 disabled:cursor-not-allowed
                      text-white font-bold text-lg
                      rounded-2xl px-8 py-5
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
                          className="w-6 h-6 border-3 border-white border-t-transparent rounded-full"
                        />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <LogIn size={24} />
                        Continuar
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                  <a 
                    href="/login"
                    className="text-slate-600 hover:text-slate-900 font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <Building2 size={18} />
                    Acessar painel administrativo →
                  </a>
                </div>
              </motion.div>
            )}

            {/* TELA 2: Registro com Webcam */}
            {step === 'registro' && (
              <motion.div
                key="registro"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                {/* Info do Funcionário */}
                <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {userData?.nome?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        Boa noite, {userData?.nome?.split(' ')[0]}
                      </h3>
                      <p className="text-slate-600">{userData?.cargo}</p>
                    </div>
                  </div>
                </div>

                {/* Campo Matrícula (desabilitado) */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Digite sua matrícula para começar
                  </label>
                  <input
                    type="text"
                    value={userData?.matricula}
                    disabled
                    className="
                      w-full text-center text-lg font-semibold
                      bg-slate-100 border-2 border-slate-200
                      rounded-xl px-6 py-3
                      text-slate-900
                      cursor-not-allowed
                    "
                  />
                </div>

                {/* Tipo de Registro */}
                <div className="mb-6">
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
                </div>

                {/* Webcam Preview */}
                <div className="mb-6">
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner">
                    {photo ? (
                      <img src={photo} alt="Preview" className="w-full" />
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full"
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
                          font-semibold
                          transition-all duration-200
                        "
                      >
                        ✕ Remover
                      </button>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="grid grid-cols-2 gap-4">
                  {!photo ? (
                    <>
                      <button
                        onClick={capturePhoto}
                        className="
                          col-span-2
                          bg-slate-800 hover:bg-slate-700
                          text-white font-bold text-lg
                          rounded-2xl px-8 py-5
                          shadow-lg hover:shadow-xl
                          transform hover:scale-[1.02]
                          transition-all duration-200
                          flex items-center justify-center gap-3
                        "
                      >
                        <Camera size={24} />
                        Capturar Foto
                      </button>
                      <button
                        onClick={resetForm}
                        className="
                          col-span-2
                          bg-white hover:bg-slate-50
                          text-slate-700 font-semibold
                          border-2 border-slate-200
                          rounded-2xl px-6 py-3
                          transition-all duration-200
                        "
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={registrarPonto}
                        disabled={loading}
                        className="
                          bg-emerald-600 hover:bg-emerald-700
                          disabled:bg-slate-300 disabled:cursor-not-allowed
                          text-white font-bold text-lg
                          rounded-2xl px-8 py-5
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
                      <button
                        onClick={resetForm}
                        className="
                          bg-white hover:bg-slate-50
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

                <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                  <a 
                    href="/login"
                    className="text-slate-600 hover:text-slate-900 font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <Building2 size={18} />
                    Acessar painel administrativo →
                  </a>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}