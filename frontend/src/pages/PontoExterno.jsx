import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, MapPin, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import Layout from '../components/layout/Layout';

export default function PontoExterno() {
    const [recordType, setRecordType] = useState('entrada');
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [location, setLocation] = useState(null);
    const [reason, setReason] = useState('');
    const [step, setStep] = useState(1); // 1: Type/Reason, 2: Photo, 3: Success

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.error('Erro GPS:', err),
                { enableHighAccuracy: true }
            );
        }
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
        } catch (err) {
            alert('Erro ao acessar câmera');
        }
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            setPhoto(canvas.toDataURL('image/jpeg', 0.7));
            if (stream) stream.getTracks().forEach(t => t.stop());
        }
    };

    const handleSubmit = async () => {
        if (!reason || !photo || !location) {
            setMessage({ type: 'error', text: 'Preencha todos os campos e capture a foto.' });
            return;
        }

        setLoading(true);
        try {
            // Converter base64 para Blob para enviar via multipart/form-data
            const response = await fetch(photo);
            const blob = await response.blob();

            const formData = new FormData();
            formData.append('record_type', recordType);
            formData.append('latitude', location.lat);
            formData.append('longitude', location.lng);
            formData.append('reason', reason);
            formData.append('photo', blob, 'ponto-externo.jpg');

            await api.post('/time-records/external', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setStep(3);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao enviar registro.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Ponto Externo" subtitle="Registro de visitas para consultoras">
            <div className="max-w-md mx-auto">

                {step === 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Registro</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['entrada', 'saida_final'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setRecordType(t)}
                                        className={`p-4 rounded-xl font-bold uppercase text-xs transition-all ${recordType === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                                    >
                                        {t.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Motivo / Visita</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ex: Visita ao imóvel Rua das Flores, cliente Maria..."
                                rows={3}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none"
                            />
                        </div>

                        <button
                            onClick={() => { setStep(2); startCamera(); }}
                            disabled={!reason || !location}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:bg-slate-300"
                        >
                            <Camera size={20} />
                            Próximo: Capturar Foto
                        </button>

                        {!location && (
                            <p className="text-center text-amber-600 text-xs flex items-center justify-center gap-1">
                                <AlertCircle size={14} /> Aguardando GPS...
                            </p>
                        )}
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="relative aspect-square bg-slate-900 rounded-[3rem] overflow-hidden border-4 border-white shadow-xl">
                            {!photo ? (
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            ) : (
                                <img src={photo} className="w-full h-full object-cover" />
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        <div className="flex gap-3">
                            {!photo ? (
                                <button onClick={capturePhoto} className="flex-1 bg-slate-900 text-white font-bold py-5 rounded-2xl">
                                    Capturar Foto
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => { setPhoto(null); startCamera(); }} className="flex-1 bg-white text-slate-700 border-2 border-slate-200 font-bold py-5 rounded-2xl">
                                        Tentar Novamente
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex-1 bg-emerald-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2"
                                    >
                                        {loading ? 'Enviando...' : <><Send size={20} /> Enviar</>}
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white p-12 rounded-[3rem] shadow-xl border-b-8 border-emerald-500">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Solicitação Enviada!</h2>
                        <p className="text-slate-500 mb-8">Seu registro externo foi enviado para o gestor e aguarda aprovação.</p>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl"
                        >
                            Voltar ao Início
                        </button>
                    </motion.div>
                )}

                {message && (
                    <div className={`mt-4 p-4 rounded-xl text-center font-bold text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}
            </div>
        </Layout>
    );
}
