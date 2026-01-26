import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/layout/Layout';
import { CheckCircle, XCircle, AlertTriangle, User } from 'lucide-react';

const Aprovacoes = () => {
    const [adjustments, setAdjustments] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadAdjustments = async () => {
        try {
            setLoading(true);
            // Busca apenas os pendentes
            const response = await api.get('/adjustments', { params: { status: 'pending' } });
            setAdjustments(response.data.data || []);
        } catch (error) {
            console.error('Erro ao buscar aprovações:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdjustments();
    }, []);

    const handleApprove = async (id) => {
        if (window.confirm('Confirmar aprovação deste ajuste?')) {
            try {
                await api.post(`/adjustments/${id}/approve`);
                alert('Ajuste aprovado com sucesso!');
                loadAdjustments();
            } catch (error) {
                alert('Erro ao aprovar: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Motivo da rejeição:');
        if (reason) {
            try {
                await api.post(`/adjustments/${id}/reject`, { reason });
                alert('Ajuste rejeitado.');
                loadAdjustments();
            } catch (error) {
                alert('Erro ao rejeitar: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    return (
        <Layout title="Central de Aprovações" subtitle="Gerencie solicitações de ajuste de ponto">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" />
                Aprovações Pendentes
            </h1>

            {loading ? (
                <div className="text-center py-10">Carregando...</div>
            ) : adjustments.length === 0 ? (
                <div className="bg-white p-10 rounded-lg shadow text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <p>Tudo em dia! Nenhum ajuste pendente de aprovação.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {adjustments.map((adj) => {
                        const isExternalPunch = adj.is_addition && adj.latitude && adj.longitude;

                        return (
                        <div key={adj.id} className={`bg-white p-6 rounded-lg shadow border-l-4 ${isExternalPunch ? 'border-blue-500' : 'border-orange-500'} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {isExternalPunch && (
                                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-semibold">
                                            📍 REGISTRO EXTERNO
                                        </span>
                                    )}
                                    <User size={16} className="text-gray-400" />
                                    <span className="font-semibold text-gray-800">{adj.user_name}</span>
                                    <span className="text-sm text-gray-500">({adj.matricula})</span>
                                </div>

                                {isExternalPunch ? (
                                    // Registro Externo (consultoras)
                                    <>
                                        <p className="text-sm text-gray-600 mb-2">
                                            <strong>Tipo:</strong> {adj.adjusted_type === 'entrada' ? 'Entrada' : 'Saída'}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-2">
                                            <strong>Data/Hora:</strong> {new Date(adj.adjusted_timestamp).toLocaleString('pt-BR')}
                                        </p>
                                        <div className="bg-blue-50 p-2 rounded text-sm text-gray-700 italic border border-blue-100 mb-2">
                                            <strong>Motivo:</strong> {adj.reason}
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps?q=${adj.latitude},${adj.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                                        >
                                            📍 Ver Localização GPS ({parseFloat(adj.latitude).toFixed(6)}, {parseFloat(adj.longitude).toFixed(6)})
                                        </a>
                                    </>
                                ) : (
                                    // Ajuste Normal
                                    <>
                                        <p className="text-sm text-gray-600 mb-1">
                                            <strong>Data Original:</strong> {adj.original_timestamp ? new Date(adj.original_timestamp).toLocaleString('pt-BR') : 'N/A'} {adj.original_type ? `(${adj.original_type})` : ''}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-2">
                                            <strong>Para:</strong> {new Date(adj.adjusted_timestamp).toLocaleString('pt-BR')} ({adj.adjusted_type})
                                        </p>
                                        <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 italic border border-gray-100">
                                            "{adj.reason}"
                                        </div>
                                        {adj.latitude && adj.longitude && (
                                            <a
                                                href={`https://www.google.com/maps?q=${adj.latitude},${adj.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1"
                                            >
                                                📍 Ver Localização no Mapa
                                            </a>
                                        )}
                                    </>
                                )}

                                <p className="text-xs text-gray-400 mt-2">
                                    Solicitado em {new Date(adj.adjusted_at).toLocaleDateString('pt-BR')} às {new Date(adj.adjusted_at).toLocaleTimeString('pt-BR')}
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                {adj.photo_data && (
                                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={`data:image/jpeg;base64,${adj.photo_data}`} alt="Comprovante" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                                    <button
                                        onClick={() => handleApprove(adj.id)}
                                        className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 transition"
                                    >
                                        <CheckCircle size={18} /> Aprovar
                                    </button>
                                    <button
                                        onClick={() => handleReject(adj.id)}
                                        className="bg-red-100 text-red-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-red-200 transition"
                                    >
                                        <XCircle size={18} /> Rejeitar
                                    </button>
                                </div>
                            </div>
                        </div>
                    );})}
                </div>
            )}
        </Layout>
    );
};

export default Aprovacoes;
