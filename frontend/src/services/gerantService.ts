import api from './api';

export interface Session {
  id: string;
  clientId: string;
  posteId: string;
  startTime: string;
  endTime?: string;
  duration: number; // en heures
  amount: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface Client {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  balance: number;
}

export interface Recharge {
  id: string;
  clientId: string;
  amount: number;
  paymentMethod: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
}

const gerantService = {
  // ─── DASHBOARD ───────────────────────────────────

  /**
   * Récupérer les données du dashboard gérant
   */
  getDashboard: async (): Promise<any> => {
    const response = await api.get('/gerant/dashboard');
    return response.data;
  },

  // ─── SESSIONS ───────────────────────────────────

  /**
   * Créer une nouvelle session
   */
  createSession: async (data: Omit<Session, 'id'>): Promise<Session> => {
    const response = await api.post('/gerant/session/new', data);
    return response.data.session;
  },

  /**
   * Récupérer toutes les sessions
   */
  getSessions: async (): Promise<Session[]> => {
    const response = await api.get('/gerant/sessions');
    return response.data.sessions;
  },

  /**
   * Récupérer une session spécifique
   */
  getSession: async (id: string): Promise<Session> => {
    const response = await api.get(`/gerant/sessions/${id}`);
    return response.data.session;
  },

  /**
   * Mettre à jour une session
   */
  updateSession: async (id: string, data: Partial<Session>): Promise<Session> => {
    const response = await api.put(`/gerant/sessions/${id}`, data);
    return response.data.session;
  },

  /**
   * Terminer une session
   */
  endSession: async (id: string): Promise<Session> => {
    const response = await api.post(`/gerant/sessions/${id}/end`, {});
    return response.data.session;
  },

  // ─── CLIENTS ───────────────────────────────────

  /**
   * Récupérer tous les clients du gérant
   */
  getClients: async (): Promise<Client[]> => {
    const response = await api.get('/gerant/clients');
    return response.data.clients;
  },

  /**
   * Récupérer un client spécifique
   */
  getClient: async (id: string): Promise<Client> => {
    const response = await api.get(`/gerant/clients/${id}`);
    return response.data.client;
  },

  /**
   * Mettre à jour un client
   */
  updateClient: async (id: string, data: Partial<Client>): Promise<Client> => {
    const response = await api.put(`/gerant/clients/${id}`, data);
    return response.data.client;
  },

  // ─── RECHARGES ───────────────────────────────────

  /**
   * Récupérer toutes les recharges
   */
  getRecharges: async (): Promise<Recharge[]> => {
    const response = await api.get('/gerant/recharges');
    return response.data.recharges;
  },

  /**
   * Créer une recharge
   */
  createRecharge: async (data: Omit<Recharge, 'id'>): Promise<Recharge> => {
    const response = await api.post('/gerant/recharges', data);
    return response.data.recharge;
  },

  /**
   * Récupérer les recharges d'un client
   */
  getClientRecharges: async (clientId: string): Promise<Recharge[]> => {
    const response = await api.get(`/gerant/clients/${clientId}/recharges`);
    return response.data.recharges;
  },

  // ─── RAPPORTS ───────────────────────────────────

  /**
   * Récupérer les rapports du gérant
   */
  getRapports: async (): Promise<any[]> => {
    const response = await api.get('/gerant/rapport');
    return response.data.rapports;
  },

  /**
   * Générer un rapport pour une période
   */
  generateRapport: async (startDate: string, endDate: string): Promise<any> => {
    const response = await api.post('/gerant/rapport/generate', {
      startDate,
      endDate,
    });
    return response.data.rapport;
  },
};

export default gerantService;
