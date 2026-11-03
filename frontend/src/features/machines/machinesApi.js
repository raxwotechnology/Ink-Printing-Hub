import api from '../../api/axios';

export const machinesApi = {
    // Machines
    getMachines: async (params) => {
        const res = await api.get('/machines', { params });
        return res.data;
    },
    getMachineById: async (id) => {
        const res = await api.get(`/machines/${id}`);
        return res.data;
    },
    createMachine: async (data) => {
        const res = await api.post('/machines', data);
        return res.data;
    },
    updateMachine: async (id, data) => {
        const res = await api.put(`/machines/${id}`, data);
        return res.data;
    },
    deleteMachine: async (id) => {
        const res = await api.delete(`/machines/${id}`);
        return res.data;
    },

    // Machine Repairs
    getRepairs: async (params) => {
        const res = await api.get('/machine-repairs', { params });
        return res.data;
    },
    createRepair: async (data) => {
        const res = await api.post('/machine-repairs', data);
        return res.data;
    },
    updateRepair: async (id, data) => {
        const res = await api.put(`/machine-repairs/${id}`, data);
        return res.data;
    },
    deleteRepair: async (id) => {
        const res = await api.delete(`/machine-repairs/${id}`);
        return res.data;
    },
};
