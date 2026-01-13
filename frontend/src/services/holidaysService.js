import api from './api';

const holidaysService = {
    // Criar feriado
    create: async (data) => {
        const response = await api.post('/holidays', data);
        return response.data;
    },

    // Listar todos
    getAll: async (year) => {
        const response = await api.get('/holidays', { params: { year } });
        return response.data;
    },

    // Remover
    delete: async (id) => {
        const response = await api.delete(`/holidays/${id}`);
        return response.data;
    }
};

export default holidaysService;
