import api from './api';

const clientService = {
  getHome: async (): Promise<any> => {
    const res = await api.get('/client/home');
    return res.data;
  },

  getSessions: async (): Promise<any[]> => {
    const res = await api.get('/client/sessions');
    return res.data;
  },

  getLeaderboard: async (): Promise<any> => {
    const res = await api.get('/client/leaderboard');
    return res.data;
  },

  startSession: async (data: { categorieId: number; dureeId: number; useBonus?: boolean }): Promise<any> => {
    const res = await api.post('/client/session/start', data);
    return res.data;
  },

  stopSession: async (sessionId: number): Promise<any> => {
    const res = await api.post(`/client/session/${sessionId}/stop`);
    return res.data;
  },

  prolongerSession: async (sessionId: number, data: { dureeId: number; useBonus?: boolean }): Promise<any> => {
    const res = await api.post(`/client/session/${sessionId}/prolonger`, data);
    return res.data;
  },

  reprendreSession: async (sessionId: number): Promise<any> => {
    const res = await api.post(`/client/session/${sessionId}/reprendre`);
    return res.data;
  },

  utiliserCoupon: async (code: string): Promise<any> => {
    const res = await api.post('/client/coupon', { code });
    return res.data;
  },

  getCategories: async (): Promise<any[]> => {
    const res = await api.get('/client/categories');
    return res.data;
  },

  getDurees: async (categorieId: number): Promise<any[]> => {
    const res = await api.get(`/client/categories/${categorieId}/durees`);
    return res.data;
  },
};

export default clientService;
