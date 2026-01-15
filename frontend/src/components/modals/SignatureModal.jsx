import { useRef, useState } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import { X, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SignatureModal({ isOpen, onClose, onSave }) {
    const sigCanvas = useRef({});
    const [isEmpty, setIsEmpty] = useState(true);

    const clear = () => {
        sigCanvas.current.clear();
        setIsEmpty(true);
    };

    const save = () => {
        if (isEmpty) return;
        const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        onSave(dataURL);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Assinatura Eletrônica</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    {/* Canvas Area */}
                    <div className="p-6 bg-slate-100 flex justify-center">
                        <div className="border-2 border-slate-300 rounded-lg bg-white shadow-inner overflow-hidden">
                            <ReactSignatureCanvas
                                ref={sigCanvas}
                                penColor="black"
                                canvasProps={{
                                    width: 400,
                                    height: 200,
                                    className: 'signature-canvas'
                                }}
                                onBegin={() => setIsEmpty(false)}
                            />
                        </div>
                    </div>

                    <div className="px-6 text-xs text-slate-500 text-center mb-2">
                        Assine dentro do quadro acima
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-200 flex justify-between gap-4">
                        <button
                            onClick={clear}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                        >
                            <Trash2 size={18} />
                            Limpar
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={save}
                                disabled={isEmpty}
                                className={`
                  flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all
                  ${isEmpty ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}
                `}
                            >
                                <Check size={18} />
                                Confirmar
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
