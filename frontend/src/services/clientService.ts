import api from './api';

export interface ClientSession {
  id: string;
  posteId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  cost: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface ClientRecharge {
  id: string;
  amount: number;
  paymentMethod: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  expiresAt: string;
  used: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  discount: number;
  description?: string;
  expiresAt: string;
}

export interface Promotion {
  id: string;
  title: string;
  description?: string;
  discount: number;
  startDate: string;
  endDate: string;
}

export interface Leaderboard {
  rank: number;
  clientId: string;
  clientName: string;
  totalSessions: number;
  totalSpent: number;
  points: number;
}

const clientService = {
  // ─── HOME ───────────────────────────────────

  /**
   * Récupérer les données de la page d'accueil
   */
  getHome: async (): Promise<any> => {
    const response = await api.get('/client/home');
    return response.data;
  },

  /**
   * Récupérer le solde du client
   */
  getBalance: async (): Promise<{ balance: number }> => {
    const response = await api.get('/client/balance');
    return response.data;
  },

  // ─── SESSIONS ───────────────────────────────────

  /**
   * Créer une nouvelle session
   */
  createSession: async (data: Omit<ClientSession, 'id'>): Promise<ClientSession> => {
    const response = await api.post('/client/session', data);
    return response.data.session;
  },

  /**
   * Récupérer la session actuelle
   */
  getActiveSession: async (): Promise<ClientSession> => {
    const response = await api.get('/client/session');
    return response.data.session;
  },

  /**
   * Terminer une session
   */
  endSession: async (sessionId: string): Promise<ClientSession> => {
    const response = await api.post(`/client/session/${sessionId}/end`, {});
    return response.data.session;
  },

  /**
   * Récupérer l'historique des sessions
   */
  getSessions: async (limit?: number): Promise<ClientSession[]> => {
    const response = await api.get('/client/sessions', {
      params: { limit },
    });
    return response.data.sessions;
  },

  // ─── RECHARGES ───────────────────────────────────

  /**
   * Créer une recharge
   */
  createRecharge: async (data: Omit<ClientRecharge, 'id'>): Promise<ClientRecharge> => {
    const response = await api.post('/client/recharge', data);
    return response.data.recharge;
  },

  /**
   * Récupérer l'historique des recharges
   */
  getRecharges: async (limit?: number): Promise<ClientRecharge[]> => {
    const response = await api.get('/client/recharges', {
      params: { limit },
    });
    return response.data.recharges;
  },

  // ─── COUPONS ───────────────────────────────────

  /**
   * Appliquer un coupon
   */
  applyCoupon: async (code: string): Promise<any> => {
    const response = await api.post('/client/coupon', { code });
    return response.data;
  },

  /**
   * Récupérer les coupons disponibles
   */
  getCoupons: async (): Promise<Coupon[]> => {
    const response = await api.get('/client/coupons');
    return response.data.coupons;
  },

  /**
   * Récupérer les coupons utilisés
   */
  getUsedCoupons: async (): Promise<Coupon[]> => {
    const response = await api.get('/client/coupons/used');
    return response.data.coupons;
  },

  // ─── PROMO CODES ───────────────────────────────────

  /**
   * Appliquer un code promo
   */
  applyPromoCode: async (code: string): Promise<any> => {
    const response = await api.post('/client/promo-code', { code });
    return response.data;
  },

  /**
   * Récupérer les codes promo disponibles
   */
  getPromoCodes: async (): Promise<PromoCode[]> => {
    const response = await api.get('/client/promo-codes');
    return response.data.promoCodes;
  },

  // ─── PROMOTIONS ───────────────────────────────────

  /**
   * Récupérer toutes les promotions
   */
  getPromotions: async (): Promise<Promotion[]> => {
    const response = await api.get('/client/promotions');
    return response.data.promotions;
  },

  /**
   * Récupérer une promotion spécifique
   */
  getPromotion: async (id: string): Promise<Promotion> => {
    const response = await api.get(`/client/promotions/${id}`);
    return response.data.promotion;
  },

  // ─── LEADERBOARD ───────────────────────────────────

  /**
   * Récupérer le leaderboard
   */
  getLeaderboard: async (limit: number = 50): Promise<Leaderboard[]> => {
    const response = await api.get('/client/leaderboard', {
      params: { limit },
    });
    return response.data.leaderboard;
  },

  /**
   * Récupérer la position du client dans le leaderboard
   */
  getMyRank: async (): Promise<{ rank: number; points: number }> => {
    const response = await api.get('/client/leaderboard/me');
    return response.data;
  },
};

export default clientService;
