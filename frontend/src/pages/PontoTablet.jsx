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
  const [location, setLocation] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [showFlash, setShowFlash] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(!!localStorage.getItem('tablet_token'));
  const [tempToken, setTempToken] = useState('');
  const [inconsistencyData, setInconsistencyData] = useState(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [adjustmentTime, setAdjustmentTime] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [showShutter, setShowShutter] = useState(false);
  const debounceTimer = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Solicitar GPS com alta precisão e monitoramento contínuo
    let watchId = null;
    if (navigator.geolocation) {
      // Pequeno truque para "acordar" o GPS imediatamente
      navigator.geolocation.getCurrentPosition(() => { });

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          console.log('📍 GPS Atualizado:', position.coords.latitude, position.coords.longitude, 'Precisão:', position.coords.accuracy);
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => console.error('Erro GPS:', error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
    return () => {
      clearInterval(timer);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
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
    // Timer de auto-reset por inatividade (25 segundos)
    let inactivityTimer;

    if (matricula || userData || showCamera) {
      inactivityTimer = setTimeout(() => {
        console.log('⏱️ Auto-reset por inatividade');
        resetForm();
      }, 25000); // 25 segundos
    }

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [matricula, userData, showCamera, photo]);

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
      // Ativar Shutter e Flash
      setShowShutter(true);
      const colors = ['#ffffff', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00', '#00FFFF'];
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
        setTimeout(() => setShowShutter(false), 200);
      }, 100); // Foto tirada no auge do flash
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const AGENCY_COORDS = { lat: -29.9088632, lng: -51.1721065 }; // Rua Liberdade, Canoas

  const buscarUsuario = async () => {
    if (matricula.length < 3) return;

    try {
      const response = await api.get(`/tablet/user/matricula/${matricula}`);
      const user = response.data.data;

      const cargo = user.cargo?.toLowerCase() || '';
      const isConsultor = cargo.includes('consultor') || cargo.includes('consutor');

      // Detalhes do dispositivo autorizado
      const deviceInfoStr = localStorage.getItem('device_info');
      const deviceInfo = deviceInfoStr ? JSON.parse(deviceInfoStr) : null;
      const isOfficialTablet = deviceInfo?.device_type === 'tablet';

      // ✅ Lógica Consultora 
      if (isConsultor && !isOfficialTablet) {
        // Se ela estiver no celular autorizado (Consultora Teste), ela pode bater ponto, 
        // mas o backend vai exigir o fluxo de justificativa ou o GPS.

        if (!location) {
          showMessage('Aguardando GPS... Por favor, ative a localização.', 'error');
          return;
        }

        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          AGENCY_COORDS.lat,
          AGENCY_COORDS.lng
        );

        // Lógica Inteligente: Considera a margem de erro (accuracy)
        // Se a distância mínima possível (distância - precisão) for menor que 200m, bloqueia.
        const minPossibleDistance = Math.max(0, distance - location.accuracy);

        console.log(`📏 Distância Real: ${distance.toFixed(2)}m`);
        console.log(`🎯 Margem de Erro GPS: ${location.accuracy.toFixed(2)}m`);
        console.log(`🚧 Distância Mínima Provável: ${minPossibleDistance.toFixed(2)}m`);

        // Bloqueia se a distância mínima provável for muito perto da agência
        // Ou se o GPS estiver muito impreciso (mais de 1.5km de erro) dentro da empresa
        if (minPossibleDistance <= 250 || (location.accuracy > 1500 && distance < 1000)) {
          showMessage(`Acesso Móvel Bloqueado: O sistema detectou que você pode estar na agência ou o GPS está muito impreciso (${location.accuracy.toFixed(0)}m). Use o Tablet Oficial.`, 'error');
          setMatricula('');
          return;
        } else {
          // Fora da agência -> MODO EXTERNO
          setUserData({ ...user, requiresExternal: true });
          setShowCamera(true);
          startCamera();
          return;
        }
      }

      // Se NÃO for consultora e NÃO estiver no tablet autorizado -> Bloqueia geral
      if (!isConsultor && !isOfficialTablet) {
        showMessage('Acesso permitido apenas pelo dispositivo oficial da agência.', 'error');
        setMatricula('');
        return;
      }

      setUserData(user);
      // Verificação de Ponto Esquecido...
      if (user.pendingInconsistency) {
        setInconsistencyData(user.pendingInconsistency);
        setShowCamera(false);
      } else if (!user.terms_accepted_at) {
        setShowTerms(true);
        setShowCamera(false);
      } else {
        setInconsistencyData(null);
        setShowCamera(true);
        startCamera();
      }
    } catch (err) {
      setUserData(null);
      setShowCamera(false);

      if (err.response?.status === 403) {
        showMessage('Dispositivo desautorizado ou chave inválida.', 'error');
        localStorage.removeItem('tablet_token');
        localStorage.removeItem('device_info');
        setTimeout(() => setIsAuthorized(false), 2000);
      } else {
        showMessage(err.response?.data?.error || 'Matrícula não encontrada', 'error');
      }
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
      const response = await api.post('/tablet/register', {
        matricula: userData.matricula,
        record_type: recordType,
        photo,
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy
      });

      setSuccessData({
        nome: userData.nome,
        hora: formatTime(new Date()),
        tipo: recordType === 'entrada' ? 'ENTRADA' :
          recordType === 'saida_final' ? 'SAÍDA FINAL' :
            recordType === 'saida_intervalo' ? 'SAÍDA INTERVALO' : 'RETORNO INTERVALO'
      });
      setShowSuccess(true);

      setTimeout(() => {
        resetForm();
        setShowSuccess(false);
      }, 4000);

    } catch (err) {
      showMessage(err.response?.data?.error || 'Erro ao registrar ponto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const registrarPontoExternoTotem = async () => {
    if (!adjustmentReason || !photo) {
      showMessage('Preencha o motivo e tire a foto', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(photo);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('user_id', userData.id);
      formData.append('record_type', recordType);
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
      formData.append('reason', adjustmentReason);
      formData.append('photo', blob, 'externo.jpg');

      await api.post('/tablet/external-register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessData({
        nome: userData.nome,
        tipo: recordType === 'entrada' ? 'Entrada (Visita)' : 'Saída (Visita)',
        hora: currentTime.toLocaleTimeString('pt-BR')
      });

      setShowSuccess(true);
      setTimeout(() => {
        resetForm();
        setShowSuccess(false);
      }, 5000);

    } catch (err) {
      showMessage(err.response?.data?.error || 'Erro ao registrar visita', 'error');
    } finally {
      setLoading(false);
    }
  };

  const aceitarTermos = async () => {
    try {
      await api.post(`/users/${userData.id}/accept-terms`);
      setUserData({ ...userData, terms_accepted_at: new Date() });
      setShowTerms(false);
      setShowCamera(true);
    } catch (err) {
      showMessage('Erro ao aceitar termos', 'error');
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

      setSuccessData({
        nome: userData.nome,
        hora: formatTime(new Date()),
        tipo: 'PRESENÇA NO PLANTÃO'
      });
      setShowSuccess(true);

      setTimeout(() => {
        resetForm();
        setShowSuccess(false);
      }, 4000);

    } catch (err) {
      showMessage(err.response?.data?.error || 'Erro ao marcar presença', 'error');
    } finally {
      setLoading(false);
    }
  };

  const enviarAjuste = async () => {
    if (!adjustmentTime || adjustmentReason.length < 10) {
      showMessage('Informe o horário e uma justificativa válida (mín. 10 caracteres)', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/tablet/request-adjustment', {
        user_id: userData.id,
        record_id: inconsistencyData.id,
        adjusted_time: adjustmentTime,
        reason: adjustmentReason
      });

      showMessage('Solicitação de ajuste enviada com sucesso!', 'success');
      setTimeout(() => {
        resetForm();
        setInconsistencyData(null);
        setShowAdjustmentForm(false);
      }, 3000);
    } catch (err) {
      showMessage(err.response?.data?.error || 'Erro ao enviar ajuste', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMatricula('');
    setUserData(null);
    setRecordType('entrada');
    setPhoto(null);
    setAdjustmentReason('');
    setAdjustmentTime('');
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

  const getMensagemSucesso = (tipo) => {
    const hora = currentTime.getHours();

    if (tipo === 'ENTRADA') {
      if (hora < 12) return 'BOM DIA E BOM TRABALHO!';
      return 'BOA TARDE E BOM TRABALHO!';
    }

    if (tipo === 'SAÍDA INTERVALO') {
      return 'BOM APETITE E BOM DESCANSO!';
    }

    if (tipo === 'RETORNO INTERVALO') {
      return 'BOM RETORNO AO TRABALHO!';
    }

    if (tipo === 'SAÍDA FINAL') {
      if (hora < 18) return 'BOM DESCANSO E ATÉ AMANHÃ!';
      return 'BOA NOITE E BOM DESCANSO!';
    }

    return 'REGISTRO REALIZADO COM SUCESSO!';
  };

  const handleAuthorize = async () => {
    if (!tempToken) return;

    setLoading(true);
    try {
      const response = await api.get(`/tablet/validate-device/${tempToken}`);

      if (response.data.success) {
        localStorage.setItem('tablet_token', tempToken);
        // Opcional: salvar metadados do dispositivo
        localStorage.setItem('device_info', JSON.stringify(response.data.data));

        setIsAuthorized(true);
        showMessage(`Dispositivo autorizado: ${response.data.data.name}`, 'success');
      }
    } catch (err) {
      showMessage(err.response?.data?.error || 'Erro ao validar código.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Cloud className="text-slate-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Configuração do Totem</h2>
          <p className="text-slate-500 mb-8">
            Este dispositivo ainda não está autorizado. Digite a chave de segurança da agência para ativar o ponto.
          </p>

          <input
            type="password"
            value={tempToken}
            onChange={(e) => setTempToken(e.target.value)}
            placeholder="Chave de Segurança"
            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-4 text-center text-xl font-bold focus:border-slate-800 transition-all outline-none"
          />

          <button
            onClick={handleAuthorize}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all"
          >
            Autorizar Dispositivo
          </button>
        </motion.div>
      </div>
    );
  }

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

          {/* CARTÃO AMARELO - Ponto Esquecido */}
          {inconsistencyData && !showAdjustmentForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center mb-6"
            >
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-amber-600" size={40} />
              </div>
              <h2 className="text-2xl font-bold text-amber-900 mb-2">Ponto em Aberto!</h2>
              <p className="text-amber-800 mb-6">
                Olá, {userData.nome.split(' ')[0]}! Notamos que você esqueceu de registrar sua <strong>saída</strong> no dia <strong>{new Date(inconsistencyData.date).toLocaleDateString('pt-BR')}</strong>.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowAdjustmentForm(true)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl transition-all"
                >
                  Informar Saída agora
                </button>
                <button
                  onClick={resetForm}
                  className="px-8 bg-white text-amber-900 border-2 border-amber-200 font-bold py-4 rounded-xl hover:bg-amber-100 transition-all"
                >
                  Voltar
                </button>
              </div>
            </motion.div>
          )}

          {/* FORMULÁRIO DE AJUSTE */}
          {showAdjustmentForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border-2 border-slate-200 rounded-2xl p-8 mb-6"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <FileText className="text-blue-600" />
                Ajuste de Ponto Esquecido
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Que horas você saiu no dia {new Date(inconsistencyData.date).toLocaleDateString('pt-BR')}?
                  </label>
                  <input
                    type="time"
                    value={adjustmentTime}
                    onChange={(e) => setAdjustmentTime(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-bold text-center focus:border-blue-600 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Justificativa do esquecimento
                  </label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Ex: Esqueci de bater a saída ao final do expediente..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-600 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={enviarAjuste}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl disabled:bg-slate-300 transition-all"
                  >
                    {loading ? 'Enviando...' : 'Enviar para Aprovação'}
                  </button>
                  <button
                    onClick={() => setShowAdjustmentForm(false)}
                    className="px-8 bg-white text-slate-700 border-2 border-slate-200 font-bold py-4 rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Input Matrícula (Esconder se estiver em ajuste) */}
          {!showAdjustmentForm && !inconsistencyData && (
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
          )}

          {/* ===== INTERFACE PARA PONTO EXTERNO (CONSULTORAS MOBILE) ===== */}
          {userData && userData.requiresExternal && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center">
                <p className="text-amber-800 font-bold">📍 Registro Externo Detectado</p>
                <p className="text-amber-700 text-xs">Você está fora da agência. Justifique sua visita para registrar.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Registro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRecordType('entrada')}
                    className={`p-4 rounded-xl font-bold uppercase text-xs transition-all ${recordType === 'entrada' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}
                  >
                    Entrada
                  </button>
                  <button
                    onClick={() => setRecordType('saida_final')}
                    className={`p-4 rounded-xl font-bold uppercase text-xs transition-all ${recordType === 'saida_final' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}
                  >
                    Saída Final
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Justificativa / Visita</label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Ex: Visita ao imóvel Rua X, cliente Y..."
                  rows={2}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-slate-900 outline-none text-sm"
                />
              </div>

              {/* Camera Preview (Reutilizando UI existente) */}
              <div className="relative bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-200 aspect-video">
                {photo ? (
                  <img src={photo} className="w-full h-full object-cover" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}
                {/* Flash e Shutter effects... */}
                <AnimatePresence>
                  {showShutter && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[40] bg-white pointer-events-none" />}
                </AnimatePresence>
              </div>

              <div className="flex gap-3">
                {!photo ? (
                  <button onClick={capturePhoto} className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-xl">
                    Capturar Foto
                  </button>
                ) : (
                  <>
                    <button onClick={() => setPhoto(null)} className="px-6 bg-white text-slate-700 border-2 border-slate-200 font-bold py-4 rounded-xl">
                      Refazer
                    </button>
                    <button
                      onClick={registrarPontoExternoTotem}
                      disabled={loading || !adjustmentReason}
                      className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-xl disabled:bg-slate-300 shadow-lg"
                    >
                      {loading ? 'Enviando...' : 'Confirmar Visita'}
                    </button>
                  </>
                )}
              </div>

              <button onClick={resetForm} className="w-full text-slate-500 font-semibold py-2">Cancelar</button>
            </motion.div>
          )}

          {/* ===== INTERFACE PARA CLT ===== */}
          {userData && !userData.is_duty_shift_only && !userData.requiresExternal && (
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

                    {/* ✅ SHUTTER EFFECT */}
                    <AnimatePresence>
                      {showShutter && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-[40] bg-white pointer-events-none"
                        />
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
          {userData && userData.is_duty_shift_only && !userData.requiresExternal && (
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

                    {/* ✅ SHUTTER EFFECT */}
                    <AnimatePresence>
                      {showShutter && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-[40] bg-white pointer-events-none"
                        />
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

      {/* ✅ MODAL DE SUCESSO (TELA CHEIA) */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl border-b-[12px] border-emerald-500"
            >
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <Clock size={48} strokeWidth={3} />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4">
                Olá, {successData?.nome.split(' ')[0]}!
              </h2>
              <p className="text-2xl text-slate-600 mb-8">
                Sua <span className="font-bold text-slate-900">{successData?.tipo}</span> foi registrada com sucesso às <span className="font-bold text-emerald-600">{successData?.hora}</span>.
              </p>
              <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-100">
                <p className="text-emerald-600 font-black text-xl tracking-tight">
                  {getMensagemSucesso(successData?.tipo)}
                </p>
              </div>
              <p className="mt-8 text-slate-400 text-sm">Esta tela fechará automaticamente...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ MODAL DE TERMOS DE USO (JURÍDICO) */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Cloud size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Termos de Uso e Privacidade</h2>
              <div className="bg-slate-50 rounded-xl p-4 mb-6 max-h-64 overflow-y-auto text-sm text-slate-600 leading-relaxed border border-slate-200">
                <p className="mb-4 font-bold text-slate-800">CONSENTIMENTO PARA REGISTRO DE PONTO POR MEIO DE DISPOSITIVO COMPARTILHADO (TOTEM)</p>
                <p className="mb-3">
                  1. Ao utilizar este dispositivo para o registro de sua jornada de trabalho, você declara estar ciente e concorda com a captura de sua imagem (fotografia) para fins exclusivos de autenticação, segurança e conformidade com a Portaria 671/MTE.
                </p>
                <p className="mb-3">
                  2. Os dados coletados (foto, data, hora e geolocalização do tablet) são processados de forma segura e utilizados estritamente para fins de gestão de jornada, cálculo de banco de horas e obrigações legais da empresa.
                </p>
                <p className="mb-3">
                  3. Em conformidade com a LGPD (Lei Geral de Proteção de Dados), a empresa garante a proteção de suas informações e o acesso apenas a pessoas autorizadas do RH e Gestão.
                </p>
                <p>
                  Ao clicar em "Concordar e Continuar", você autoriza expressamente este procedimento para todos os futuros registros.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={aceitarTermos}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                >
                  Concordar e Continuar
                </button>
                <button
                  onClick={resetForm}
                  className="w-full text-slate-500 font-semibold py-2"
                >
                  Sair
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}