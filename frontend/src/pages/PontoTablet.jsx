import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, LogIn, Coffee, RotateCcw, LogOut, Clock, Wifi, WifiOff, Cloud, FileText } from 'lucide-react';
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
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [tapCount, setTapCount] = useState(0);
  const debounceTimer = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20));
    if (type === 'error') console.error(msg);
    else console.log(msg);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Solicitar GPS com alta precisão e monitoramento contínuo
    let watchId = null;
    if (navigator.geolocation) {
      // Pequeno truque para "acordar" o GPS imediatamente
      navigator.geolocation.getCurrentPosition(() => { });

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          addLog(`📍 GPS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)} (Prec: ${position.coords.accuracy.toFixed(0)}m)`);
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => addLog(`❌ Erro GPS: ${error.message}`, 'error'),
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

  const handleTitleTap = () => {
    setTapCount(prev => {
      if (prev + 1 >= 5) {
        setDebugMode(!debugMode);
        return 0;
      }
      return prev + 1;
    });
  };

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
      addLog('🎥 Iniciando câmera...');

      // Limpar stream antigo se houver
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      addLog('✅ Stream obtido com sucesso');
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Tentar carregar metadados (mas não bloquear se falhar)
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              addLog('⚠️ Metadados demorando, mas continuando...', 'info');
              resolve(); // Resolve mesmo sem metadados
            }, 3000);

            videoRef.current.onloadedmetadata = () => {
              clearTimeout(timeout);
              addLog(`✅ Vídeo carregado: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
              resolve();
            };

            videoRef.current.onerror = (err) => {
              clearTimeout(timeout);
              addLog('❌ Erro ao carregar vídeo', 'error');
              reject(err);
            };
          });
        } catch (metadataErr) {
          addLog('⚠️ Erro nos metadados, mas stream está ativo', 'info');
        }

        // Garantir que o vídeo está tocando
        try {
          await videoRef.current.play();
          addLog('▶️ Vídeo em reprodução');
        } catch (playErr) {
          addLog(`⚠️ Erro ao reproduzir: ${playErr.message}`, 'info');
        }
      }
    } catch (err) {
      addLog(`❌ Erro ao acessar câmera: ${err.message}`, 'error');
      console.error('Erro ao acessar câmera:', err);
      if (err.name === 'NotReadableError') {
        showMessage('Câmera em uso por outro aplicativo ou bloqueada. Feche outras abas e tente novamente.', 'error');
      } else if (err.name === 'NotAllowedError') {
        showMessage('Permissão de câmera negada. Permita o acesso à câmera.', 'error');
      } else {
        showMessage('Erro ao acessar a câmera. Verifique as permissões.', 'error');
      }
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

    addLog(`📸 Tentando capturar... Video: ${video ? 'OK' : 'NULL'} | Stream: ${video?.srcObject ? 'OK' : 'NULL'}`);

    if (!video || !canvas) {
      addLog('❌ Falha: Elementos video ou canvas não encontrados.', 'error');
      showMessage('Erro ao acessar câmera. Recarregue a página.', 'error');
      return;
    }

    if (!video.srcObject) {
      addLog('❌ Falha: Stream não está conectado ao vídeo.', 'error');
      showMessage('Câmera não inicializada. Tente novamente.', 'error');
      return;
    }

    // Obter dimensões (com fallback se forem 0)
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    addLog(`📐 Dimensões do vídeo: ${video.videoWidth}x${video.videoHeight} (usando ${width}x${height})`);

    // Ativar Shutter e Flash
    setShowShutter(true);
    const colors = ['#ffffff', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00', '#00FFFF'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setShowFlash(randomColor);

    setTimeout(() => {
      try {
        // Configurar canvas
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Não foi possível obter contexto 2D do canvas');
        }

        // Desenhar vídeo no canvas
        context.drawImage(video, 0, 0, width, height);

        // Converter para data URL
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        addLog(`📊 Tamanho da foto: ${photoData.length} bytes`);

        if (photoData && photoData.length > 1000) {
          setPhoto(photoData);
          addLog('✅ Foto capturada e salva no estado.');
          showMessage('Foto capturada com sucesso!', 'success');
        } else {
          throw new Error('Imagem capturada muito pequena ou inválida');
        }
      } catch (err) {
        addLog(`❌ Erro no processamento da imagem: ${err.message}`, 'error');
        showMessage('Erro ao processar foto. Tente novamente.', 'error');
      } finally {
        setShowFlash(null);
        setTimeout(() => setShowShutter(false), 200);
      }
    }, 100); // Foto tirada no auge do flash
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
        addLog(`👩‍💼 Consultora Detectada. Validando Localização...`);

        if (!location) {
          addLog('🟡 GPS ainda não obtido. Impedindo entrada.');
          showMessage('Aguardando GPS... Por favor, ative a localização.', 'error');
          return;
        }

        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          AGENCY_COORDS.lat,
          AGENCY_COORDS.lng
        );

        const minPossibleDistance = Math.max(0, distance - location.accuracy);
        addLog(`📏 Dist: ${distance.toFixed(0)}m | Prec: ${location.accuracy.toFixed(0)}m | Min: ${minPossibleDistance.toFixed(0)}m`);

        if (minPossibleDistance <= 250 || (location.accuracy > 1500 && distance < 1000)) {
          addLog('🛑 BLOQUEADO: Muito perto da agência.', 'error');
          showMessage(`Acesso Móvel Bloqueado: O sistema detectou que você está na agência ou o GPS está impreciso (${location.accuracy.toFixed(0)}m).`, 'error');
          setMatricula('');
          return;
        } else {
          addLog('✅ LIBERADO: Fora da agência.');
          setUserData({ ...user, requiresExternal: true });
          setShowCamera(true);
          startCamera();
          addLog('📸 Câmera Iniciada.');
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

      // Dar mais tempo se há alerta de espelho pendente
      const timeout = userData?.pendingEspelho ? 8000 : 4000;
      setTimeout(() => {
        resetForm();
        setShowSuccess(false);
      }, timeout);

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

    if (!location) {
      showMessage('Aguardando localização GPS. Tente novamente em alguns segundos.', 'error');
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
      console.error('Erro ao registrar ponto externo:', err);
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
    <div className="min-h-screen bg-slate-50">
      {/* Console de Debug (Apenas quando tapCount >= 5) */}
      <AnimatePresence>
        {debugMode && (
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[200] bg-slate-900 text-slate-100 p-4 font-mono text-[10px] h-64 overflow-y-auto shadow-2xl border-t-2 border-slate-700"
          >
            <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
              <span className="font-bold text-blue-400">CONSOLE DE DIAGNÓSTICO</span>
              <button onClick={() => setDebugLogs([])} className="text-red-400 font-bold uppercase">Limpar</button>
            </div>
            {debugLogs.map((log, i) => (
              <div key={i} className="mb-1 border-l-2 border-slate-700 pl-2 py-0.5">{log}</div>
            ))}
            {debugLogs.length === 0 && <div className="text-slate-500 italic">Nenhum log registrado ainda.</div>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-8">
        {/* Mensagens (Alertas) */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 left-4 right-4 z-[150] p-4 rounded-2xl shadow-2xl text-white font-bold text-center flex items-center justify-center gap-3 ${message.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header com Trigger de Debug */}
        <div className="text-center mb-4 sm:mb-8" onClick={handleTitleTap}>
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2 cursor-pointer select-none active:scale-95 transition-transform">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-slate-900 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <Clock size={20} className="sm:hidden" />
              <Clock size={28} className="hidden sm:block" />
            </div>
            <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight">
              Sistema de Presença - Jardim do Lago
            </h1>
          </div>
          <p className="text-xs sm:text-base text-slate-500 font-medium">Registro de presença</p>
          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-3">
            <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border ${location ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              <div className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full ${location ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {location ? 'GPS Ativo' : 'Aguardando GPS...'}
            </div>
            <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border ${isOnline ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {isOnline ? <Wifi size={10} className="sm:hidden" /> : <WifiOff size={10} className="sm:hidden" />}
              {isOnline ? <Wifi size={12} className="hidden sm:block" /> : <WifiOff size={12} className="hidden sm:block" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <div className={`max-w-xl mx-auto bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-4 sm:p-8 border border-slate-100 transition-all ${userData ? 'max-w-4xl' : 'max-w-xl'}`}>

          {/* Saudação */}
          {
            userData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl sm:rounded-2xl p-3 sm:p-6 mb-3 sm:mb-6 ${userData.is_duty_shift_only
                  ? 'bg-blue-50'
                  : 'bg-slate-50'
                  }`}
              >
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex items-center justify-center ${userData.is_duty_shift_only
                    ? 'bg-blue-600'
                    : 'bg-slate-800'
                    }`}>
                    <span className="text-white text-base sm:text-2xl font-bold">
                      {userData.nome.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900">
                      {getSaudacao()}, {userData?.nome?.split(' ')[0]}
                    </p>
                    <p className="text-xs sm:text-base text-slate-600 flex items-center gap-2">
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
            )
          }

          {/* CARTÃO AMARELO - Ponto Esquecido */}
          {
            inconsistencyData && !showAdjustmentForm && (
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
                  Olá, {userData?.nome?.split(' ')[0]}! Notamos que você esqueceu de registrar sua <strong>saída</strong> no dia <strong>{new Date(inconsistencyData.date).toLocaleDateString('pt-BR')}</strong>.
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
            )
          }

          {/* FORMULÁRIO DE AJUSTE */}
          {
            showAdjustmentForm && (
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
            )
          }

          {/* Input Matrícula (Esconder se estiver em ajuste) */}
          {
            !showAdjustmentForm && !inconsistencyData && (
              <div className={`mb-4 sm:mb-6 ${!userData ? 'text-center py-4 sm:py-12' : ''}`}>
                <label className={`block font-semibold text-slate-700 mb-2 sm:mb-4 ${!userData ? 'text-sm sm:text-lg' : 'text-xs sm:text-sm'}`}>
                  Digite sua matrícula para começar
                </label>
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                  placeholder="000000, CORR001 ou GESTOR001"
                  maxLength={10}
                  className={`
                px-3 sm:px-6 py-2 sm:py-4 text-center font-bold
                bg-slate-50 border-2 border-slate-200
                focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10
                rounded-xl sm:rounded-2xl outline-none transition-all
                placeholder:text-slate-300
                ${!userData
                      ? 'w-full max-w-md mx-auto text-2xl sm:text-4xl tracking-wider'
                      : 'w-full text-lg sm:text-2xl'
                    }
              `}
                  autoFocus
                />
              </div>
            )
          }

          {/* ===== INTERFACE PARA PONTO EXTERNO (CONSULTORAS MOBILE) ===== */}
          {
            userData && userData.requiresExternal && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center">
                  <p className="text-amber-800 font-bold">📍 Registro Externo Detectado</p>
                  <p className="text-amber-700 text-xs">Você está fora da agência. Justifique sua visita para registrar.</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1 sm:mb-2">Tipo de Registro</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRecordType('entrada')}
                      className={`p-2 sm:p-4 rounded-lg sm:rounded-xl font-bold uppercase text-[10px] sm:text-xs transition-all ${recordType === 'entrada' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}
                    >
                      Entrada
                    </button>
                    <button
                      onClick={() => setRecordType('saida_final')}
                      className={`p-2 sm:p-4 rounded-lg sm:rounded-xl font-bold uppercase text-[10px] sm:text-xs transition-all ${recordType === 'saida_final' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}
                    >
                      Saída Final
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1 sm:mb-2">Justificativa / Visita</label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Ex: Visita ao imóvel Rua X, cliente Y..."
                    rows={2}
                    className="w-full p-2 sm:p-4 bg-slate-50 border-2 border-slate-200 rounded-lg sm:rounded-xl focus:border-slate-900 outline-none text-xs sm:text-sm"
                  />
                </div>

                {/* Camera Preview (Reutilizando UI existente) */}
                <div className="relative bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-200 aspect-video">
                  {photo ? (
                    <img src={photo} className="w-full h-full object-cover" />
                  ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  )}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* ✅ MÁSCARA DE ENQUADRAMENTO */}
                  {!photo && !countdown && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-32 h-44 border-2 border-dashed border-white/20 rounded-full"></div>
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
                        <span className="text-7xl font-black text-white drop-shadow-2xl">
                          {countdown}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ✅ SHUTTER EFFECT */}
                  <AnimatePresence>
                    {showShutter && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[40] bg-white pointer-events-none" />}
                  </AnimatePresence>

                  {/* ✅ FLASH DE AUTENTICIDADE */}
                  <AnimatePresence>
                    {showFlash && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 pointer-events-none"
                        style={{ backgroundColor: showFlash }}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  {!photo ? (
                    <button onClick={capturePhoto} className="flex-1 bg-slate-900 text-white font-bold py-2 sm:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base">
                      Capturar Foto
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setPhoto(null)} className="px-3 sm:px-6 bg-white text-slate-700 border-2 border-slate-200 font-bold py-2 sm:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base">
                        Refazer
                      </button>
                      <button
                        onClick={registrarPontoExternoTotem}
                        disabled={loading || !adjustmentReason}
                        className="flex-1 bg-emerald-600 text-white font-bold py-2 sm:py-4 rounded-lg sm:rounded-xl disabled:bg-slate-300 shadow-lg text-sm sm:text-base"
                      >
                        {loading ? 'Enviando...' : 'Confirmar Visita'}
                      </button>
                    </>
                  )}
                </div>

                <button onClick={resetForm} className="w-full text-slate-500 font-semibold py-1 sm:py-2 text-sm sm:text-base">Cancelar</button>
              </motion.div>
            )
          }

          {/* ===== INTERFACE PARA CLT ===== */}
          {
            userData && !userData.is_duty_shift_only && !userData.requiresExternal && (
              <>
                {/* Tipo de Registro */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 sm:mb-6"
                >
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3">
                    Selecione o tipo de registro
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      onClick={() => setRecordType('entrada')}
                      className={`
                      px-3 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-xl font-semibold
                      border-2 transition-all duration-200
                      flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base
                      ${recordType === 'entrada'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }
                    `}
                    >
                      <LogIn size={16} className="sm:hidden" />
                      <LogIn size={20} className="hidden sm:block" />
                      Entrada
                    </button>
                    <button
                      onClick={() => setRecordType('saida_intervalo')}
                      className={`
                      px-3 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-xl font-semibold
                      border-2 transition-all duration-200
                      flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base
                      ${recordType === 'saida_intervalo'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }
                    `}
                    >
                      <Coffee size={16} className="sm:hidden" />
                      <Coffee size={20} className="hidden sm:block" />
                      Saída Intervalo
                    </button>
                    <button
                      onClick={() => setRecordType('retorno_intervalo')}
                      className={`
                      px-3 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-xl font-semibold
                      border-2 transition-all duration-200
                      flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base
                      ${recordType === 'retorno_intervalo'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }
                    `}
                    >
                      <RotateCcw size={16} className="sm:hidden" />
                      <RotateCcw size={20} className="hidden sm:block" />
                      Retorno Intervalo
                    </button>
                    <button
                      onClick={() => setRecordType('saida_final')}
                      className={`
                      px-3 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-xl font-semibold
                      border-2 transition-all duration-200
                      flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base
                      ${recordType === 'saida_final'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }
                    `}
                    >
                      <LogOut size={16} className="sm:hidden" />
                      <LogOut size={20} className="hidden sm:block" />
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
                    w-full text-white font-bold text-sm sm:text-lg
                    rounded-xl sm:rounded-2xl px-4 sm:px-8 py-3 sm:py-5 mb-2 sm:mb-3
                    shadow-lg hover:shadow-xl
                    transform hover:scale-[1.02]
                    transition-all duration-200
                    flex items-center justify-center gap-2 sm:gap-3
                    ${countdown !== null ? 'bg-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}
                  `}
                  >
                    <Camera size={18} className="sm:hidden" />
                    <Camera size={24} className="hidden sm:block" />
                    {countdown !== null ? `Aguarde (${countdown})...` : 'Capturar Foto'}
                  </button>
                ) : (
                  <button
                    onClick={registrarPonto}
                    disabled={loading}
                    className="
                    w-full bg-emerald-600 hover:bg-emerald-700
                    disabled:bg-slate-300 disabled:cursor-not-allowed
                    text-white font-bold text-sm sm:text-lg
                    rounded-xl sm:rounded-2xl px-4 sm:px-8 py-3 sm:py-5 mb-2 sm:mb-3
                    shadow-lg hover:shadow-xl
                    transform hover:scale-[1.02]
                    transition-all duration-200
                    flex items-center justify-center gap-2 sm:gap-3
                  "
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 sm:w-5 sm:h-5 border-2 sm:border-3 border-white border-t-transparent rounded-full"
                        />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <Camera size={18} className="sm:hidden" />
                        <Camera size={24} className="hidden sm:block" />
                        Registrar Ponto
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={resetForm}
                  className="
                  w-full bg-white hover:bg-slate-50
                  text-slate-700 font-semibold text-sm sm:text-base
                  border-2 border-slate-200
                  rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2 sm:py-3
                  transition-all duration-200
                "
                >
                  Cancelar
                </button>
              </>
            )
          }

          {/* ===== INTERFACE PARA PLANTONISTA ===== */}
          {
            userData && userData.is_duty_shift_only && !userData.requiresExternal && (
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
            )
          }
        </div >
      </div >

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
                Olá, {successData?.nome?.split(' ')[0]}!
              </h2>
              <p className="text-2xl text-slate-600 mb-8">
                Sua <span className="font-bold text-slate-900">{successData?.tipo}</span> foi registrada com sucesso às <span className="font-bold text-emerald-600">{successData?.hora}</span>.
              </p>
              <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-100">
                <p className="text-emerald-600 font-black text-xl tracking-tight">
                  {getMensagemSucesso(successData?.tipo)}
                </p>
              </div>
              {userData?.pendingEspelho && (
                <div className="mt-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
                  <p className="text-amber-800 font-bold text-lg mb-1">Espelho de Ponto Pendente</p>
                  <p className="text-amber-700 text-sm">{userData.pendingEspelho.message}</p>
                  <p className="text-amber-600 text-xs mt-2 font-semibold">Acesse: jardimdolagoponto.up.railway.app/espelho</p>
                </div>
              )}
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