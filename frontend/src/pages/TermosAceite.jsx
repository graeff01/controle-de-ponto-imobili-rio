import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { FileText, PenTool, Trash2, CheckCircle, ScrollText } from 'lucide-react';
import ReactSignatureCanvas from 'react-signature-canvas';
import TermosCompromisso, { TERMS_VERSION } from '../components/terms/TermosCompromisso';
import api from '../services/api';

export default function TermosAceite() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const sigCanvas = useRef({});

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [sigEmpty, setSigEmpty] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      setHasScrolledToBottom(true);
    }
  }, []);

  const handleSubmit = async () => {
    if (!accepted || sigEmpty) return;

    setLoading(true);
    setError('');

    try {
      const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

      await api.post('/terms/accept', {
        signature: signatureData,
        terms_version: TERMS_VERSION
      });

      setSuccess(true);

      // Atualizar user no context
      await refreshUser();

      // Redirecionar após 2s
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar aceite. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Termo Assinado!</h2>
          <p className="text-slate-600">Seu aceite foi registrado com sucesso. Redirecionando...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-slate-900 rounded-xl mx-auto mb-3 flex items-center justify-center">
            <ScrollText className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Termo de Compromisso</h1>
          <p className="text-slate-500 text-sm mt-1">
            Leia atentamente o termo abaixo e assine para continuar
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Área scrollável do termo */}
          <div
            onScroll={handleScroll}
            className="max-h-[400px] overflow-y-auto p-6 border-b border-slate-200"
          >
            <TermosCompromisso />
          </div>

          {/* Indicador de scroll */}
          {!hasScrolledToBottom && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
              <p className="text-amber-700 text-xs font-medium">
                Role o documento até o final para habilitar a assinatura
              </p>
            </div>
          )}

          {/* Checkbox de aceite */}
          <div className="p-6 border-b border-slate-200">
            <label className={`flex items-start gap-3 cursor-pointer ${!hasScrolledToBottom ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={!hasScrolledToBottom}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-sm text-slate-700 leading-relaxed">
                <strong>Declaro que li integralmente</strong> o Termo de Compromisso e Responsabilidade acima,
                {' '}<strong>compreendi</strong> todas as condições e <strong>concordo</strong> com todos os termos estabelecidos.
              </span>
            </label>
          </div>

          {/* Área de assinatura */}
          {accepted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <PenTool size={18} className="text-slate-600" />
                <p className="text-sm font-semibold text-slate-700">Assinatura Digital</p>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Desenhe sua assinatura/rubrica no campo abaixo:
              </p>

              <div className="border-2 border-slate-300 rounded-xl bg-white shadow-inner overflow-hidden mx-auto" style={{ maxWidth: 460 }}>
                <ReactSignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{
                    width: 450,
                    height: 200,
                    className: 'w-full'
                  }}
                  onBegin={() => setSigEmpty(false)}
                />
              </div>

              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => { sigCanvas.current.clear(); setSigEmpty(true); }}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm"
                >
                  <Trash2 size={16} />
                  Limpar
                </button>

                <p className="text-xs text-slate-400">
                  Versão {TERMS_VERSION}
                </p>
              </div>

              {/* Erro */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Botão confirmar */}
              <button
                onClick={handleSubmit}
                disabled={sigEmpty || loading}
                className={`
                  w-full mt-4 py-3.5 rounded-lg font-semibold text-base transition-all flex items-center justify-center gap-2
                  ${sigEmpty || loading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md'
                  }
                `}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Assinar e Aceitar Termo
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
