import api from '../../api/axios';

export const quotationsApi = {
    list: async (params = {}) => (await api.get('/quotations', { params })).data,
    getById: async (id) => (await api.get(`/quotations/${id}`)).data,
    create: async (data) => (await api.post('/quotations', data)).data,
    update: async (id, data) => (await api.put(`/quotations/${id}`, data)).data,
    changeStatus: async (id, status, reason) =>
        (await api.patch(`/quotations/${id}/status`, { status, reason })).data,
    convertToInvoice: async (id, data = {}) =>
        (await api.post(`/quotations/${id}/convert-to-invoice`, data)).data,
    delete: async (id) => (await api.delete(`/quotations/${id}`)).data,
};

