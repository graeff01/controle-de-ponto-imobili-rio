import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, LogIn, Coffee, RotateCcw, LogOut, Clock, Wifi, WifiOff, Cloud } from 'lucide-react';
import api from '../services/api';
import { useSync } from '../services/syncService';
import { offlineStorage } from '../services/offlineStorage';

export default function Tablet() {
  const { isOnline, pendingCount } = useSync();
  const [matricula, setMatricula] = useState('');
  const [userData, setUserData] = useState(null);
  const [recordType, setRecordType] = useState('entrada');
  const [photo, setPhoto] = useState(null);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [location, setLocation] = useState(null); // ✅ Estado para GPS
  const [countdown, setCountdown] = useState(null); // ✅ Estado para Contagem
  const [showFlash, setShowFlash] = useState(null); // ✅ Estado para Flash (guarda a cor)
  const debounceTimer = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    // Solicitar GPS ao carregar
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 GPS obtido:', position.coords);
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => console.error('Erro GPS:', error),
        { enableHighAccuracy: true }
      );
    }
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

  useEffect(() => {
    // Limpar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Se matrícula vazia, limpar
    if (matricula.length === 0) {
      setUserData(null);
      setShowCamera(false);
      return;
    }

    // Só busca quando tiver tamanho válido (6=CLT, 7=PJ, 9=Gestor)
    const isValidLength = matricula.length === 6 || matricula.length === 7 || matricula.length === 9;

    if (!isValidLength) {
      return; // Não busca enquanto ainda está digitando
    }

    // Validar formato
    const isNumeric = /^\d{6}$/.test(matricula); // 000001
    const isBroker = /^CORR\d{3}$/.test(matricula); // CORR001
    const isManager = /^GESTOR\d{3}$/.test(matricula); // GESTOR001

    if (!isNumeric && !isBroker && !isManager) {
      console.log('❌ Formato inválido:', matricula);
      return;
    }

    // Aguarda 500ms após parar de digitar
    debounceTimer.current = setTimeout(() => {
      console.log('🔍 Buscando matrícula:', matricula);
      buscarUsuario();
    }, 500);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
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
    if (countdown !== null) return; // Evita cliques múltiplos

    let count = 3;
    setCountdown(count);

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(timer);
        setCountdown(null);
        executeCapture();
      }
    }, 1000);
  };

  const executeCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      // Ativar Flash
      const colors = ['#00FF00', '#0000FF', '#FF00FF', '#FFFF00', '#00FFFF'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      setShowFlash(randomColor);

      setTimeout(() => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        setShowFlash(null);
      }, 50); // Foto tirada no auge do flash
    }
  };

  const buscarUsuario = async () => {
    if (matricula.length < 3) return;

    try {
      const response = await api.get(`/users/matricula/${matricula}`);
      setUserData(response.data.data);
      setShowCamera(true); // ✅ Ativa câmera para TODOS
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

    // ✅ OFFLINE MODE
    if (!isOnline) {
      try {
        await offlineStorage.saveRecord({
          matricula: userData.matricula,
          record_type: recordType,
          photo,
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracy: location?.accuracy
        });

        showMessage('Ponto salvo localmente! Será enviado quando houver conexão.', 'success');

        setTimeout(() => {
          resetForm();
        }, 3000);
      } catch (err) {
        console.error(err);
        showMessage('Erro ao salvar localmente.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      await api.post('/tablet/register', {
        matricula: userData.matricula,
        record_type: recordType,
        photo,
        latitude: location?.latitude, // ✅ GPS
        longitude: location?.longitude, // ✅ GPS
        accuracy: location?.accuracy  // ✅ GPS
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

  const marcarPresenca = async () => {
    if (!userData) {
      showMessage('Digite uma matrícula válida', 'error');
      return;
    }

    if (!photo) {
      showMessage('Capture uma foto antes de registrar', 'error');
      return;
    }

    setLoading(true);

    // ✅ OFFLINE MODE
    if (!isOnline) {
      try {
        await offlineStorage.saveRecord({
          user_id: userData.id,
          isDutyShift: true,
          photo: photo,
          notes: '',
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracy: location?.accuracy
        });

        showMessage(`Presença salva localmente! Bem-vindo(a), ${userData.nome.split(' ')[0]}`, 'success');

        setTimeout(() => {
          resetForm();
        }, 3000);
      } catch (err) {
        console.error(err);
        showMessage('Erro ao salvar localmente.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      await api.post('/duty-shifts/mark-presence', {
        user_id: userData.id,
        photo: photo,
        notes: '',
        latitude: location?.latitude, // ✅ GPS
        longitude: location?.longitude, // ✅ GPS
        accuracy: location?.accuracy  // ✅ GPS
      });

      showMessage(`Presença registrada! Bem-vindo(a), ${userData.nome.split(' ')[0]}`, 'success');

      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (err) {
      showMessage(err.response?.data?.error || 'Erro ao marcar presença', 'error');
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
                <h1 className="text-2xl font-bold text-slate-900">Sistema de Presença - Jardim do Lago</h1>
                <p className="text-slate-600">Registro de presença</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-4xl font-bold text-slate-900 tabular-nums">
                {formatTime(currentTime)}
              </div>
              <p className="text-sm text-slate-600 capitalize mb-1">
                {formatDate(currentTime)}
              </p>

              <div className="flex flex-col items-end gap-1">
                {location ? (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                    <span>📍 GPS Ativo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
                    <span>⚠️ Sem GPS</span>
                  </div>
                )}

                {isOnline ? (
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                    <Wifi size={14} />
                    <span>Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-500 text-xs font-medium">
                    <WifiOff size={14} />
                    <span>Offline</span>
                  </div>
                )}

                {pendingCount > 0 && (
                  <div className="flex items-center gap-1 text-orange-500 text-xs font-medium animate-pulse">
                    <Cloud size={14} />
                    <span>{pendingCount} Pendentes</span>
                  </div>
                )}
              </div>
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
              className={`rounded-2xl p-6 mb-6 ${userData.is_duty_shift_only
                ? 'bg-blue-50'
                : 'bg-slate-50'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${userData.is_duty_shift_only
                  ? 'bg-blue-600'
                  : 'bg-slate-800'
                  }`}>
                  <span className="text-white text-2xl font-bold">
                    {userData.nome.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {getSaudacao()}, {userData.nome.split(' ')[0]}
                  </p>
                  <p className="text-slate-600 flex items-center gap-2">
                    {userData.cargo}
                    {userData.is_duty_shift_only && (
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold">
                        📋 Plantonista
                      </span>
                    )}
                  </p>
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
              placeholder="000000, CORR001 ou GESTOR001"
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

          {/* ===== INTERFACE PARA CLT ===== */}
          {userData && !userData.is_duty_shift_only && (
            <>
              {/* Tipo de Registro */}
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

                    {/* ✅ MÁSCARA DE ENQUADRAMENTO (Só aparece se não houver foto e não estiver em contagem) */}
                    {!photo && !countdown && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <svg className="w-48 h-64 text-white/30" viewBox="0 0 100 100">
                          <path d="M50,10 C30,10 15,30 15,50 C15,70 30,90 50,90 C70,90 85,70 85,50 C85,30 70,10 50,10 Z M50,15 C68,15 80,32 80,50 C80,68 68,85 50,85 C32,85 20,68 20,50 C20,32 32,15 50,15 Z" fill="currentColor" />
                          <path d="M30,45 C30,40 35,35 40,35 C45,35 50,40 50,45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M50,45 C50,40 55,35 60,35 C65,35 70,40 70,45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M40,70 C40,75 60,75 60,70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <div className="absolute top-4 left-0 right-0 text-center">
                          <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-widest font-bold">
                            Alinhe seu rosto
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ✅ CONTAGEM REGRESSIVA */}
                    <AnimatePresence>
                      {countdown && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1.2, opacity: 1 }}
                          exit={{ scale: 2, opacity: 0 }}
                          key={countdown}
                          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                        >
                          <span className="text-8xl font-black text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                            {countdown}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ✅ FLASH DE AUTENTICIDADE */}
                    <AnimatePresence>
                      {showFlash && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-30 pointer-events-none"
                          style={{ backgroundColor: showFlash }}
                        />
                      )}
                    </AnimatePresence>

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

              {/* Botões de Ação (CLT) */}
              {!photo ? (
                <button
                  onClick={capturePhoto}
                  disabled={countdown !== null}
                  className={`
                    w-full text-white font-bold text-lg
                    rounded-2xl px-8 py-5 mb-3
                    shadow-lg hover:shadow-xl
                    transform hover:scale-[1.02]
                    transition-all duration-200
                    flex items-center justify-center gap-3
                    ${countdown !== null ? 'bg-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}
                  `}
                >
                  <Camera size={24} />
                  {countdown !== null ? `Aguarde (${countdown})...` : 'Capturar Foto'}
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

          {/* ===== INTERFACE PARA PLANTONISTA ===== */}
          {/* ===== INTERFACE PARA PLANTONISTA ===== */}
          {userData && userData.is_duty_shift_only && (
            <>
              {/* Badge Plantonista */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center"
              >
                <p className="text-blue-900 font-bold text-lg mb-2">
                  📋 Corretor Plantonista (PJ)
                </p>
                <p className="text-blue-700 text-sm">
                  Tire uma foto e confirme sua presença no plantão de hoje
                </p>
              </motion.div>

              {/* Webcam Preview */}
              {showCamera && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6"
                >
                  <div className="relative bg-gradient-to-br from-blue-800 to-blue-900 rounded-2xl overflow-hidden border-2 border-blue-700 shadow-inner">
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

                    {/* ✅ MÁSCARA DE ENQUADRAMENTO */}
                    {!photo && !countdown && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <svg className="w-48 h-64 text-white/30" viewBox="0 0 100 100">
                          <path d="M50,10 C30,10 15,30 15,50 C15,70 30,90 50,90 C70,90 85,70 85,50 C85,30 70,10 50,10 Z M50,15 C68,15 80,32 80,50 C80,68 68,85 50,85 C32,85 20,68 20,50 C20,32 32,15 50,15 Z" fill="currentColor" />
                          <path d="M30,45 C30,40 35,35 40,35 C45,35 50,40 50,45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M50,45 C50,40 55,35 60,35 C65,35 70,40 70,45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M40,70 C40,75 60,75 60,70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}

                    {/* ✅ CONTAGEM REGRESSIVA */}
                    <AnimatePresence>
                      {countdown && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1.2, opacity: 1 }}
                          exit={{ scale: 2, opacity: 0 }}
                          key={countdown}
                          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                        >
                          <span className="text-8xl font-black text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                            {countdown}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ✅ FLASH DE AUTENTICIDADE */}
                    <AnimatePresence>
                      {showFlash && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-30 pointer-events-none"
                          style={{ backgroundColor: showFlash }}
                        />
                      )}
                    </AnimatePresence>

                    {photo && (
                      <button
                        onClick={() => setPhoto(null)}
                        className="
                          absolute top-4 right-4
                          bg-blue-800/90 hover:bg-blue-700
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

              {/* Botões de Ação (Plantonista) */}
              {!photo ? (
                <button
                  onClick={capturePhoto}
                  disabled={countdown !== null}
                  className={`
                    w-full text-white font-bold text-lg
                    rounded-2xl px-8 py-5 mb-3
                    shadow-lg hover:shadow-xl
                    transform hover:scale-[1.02]
                    transition-all duration-200
                    flex items-center justify-center gap-3
                    ${countdown !== null ? 'bg-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                  `}
                >
                  <Camera size={24} />
                  {countdown !== null ? `Aguarde (${countdown})...` : 'Capturar Foto'}
                </button>
              ) : (
                <button
                  onClick={marcarPresenca}
                  disabled={loading}
                  className="
                    w-full bg-blue-600 hover:bg-blue-700
                    disabled:bg-slate-300 disabled:cursor-not-allowed
                    text-white font-bold text-xl
                    rounded-2xl px-8 py-6 mb-3
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
                      Registrando presença...
                    </>
                  ) : (
                    <>
                      <Clock size={28} />
                      ✓ Marcar Presença no Plantão
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