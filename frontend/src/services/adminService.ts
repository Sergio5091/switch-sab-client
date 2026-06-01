import api from './api';

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Duree {
  id: string;
  categoryId: string;
  duration: number; // en heures
  price: number;
}

export interface Poste {
  id: string;
  name: string;
  description?: string;
}

export interface Gerant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface Bonus {
  id: string;
  name: string;
  percentage: number;
  description?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  expiresAt?: string;
}

export interface Promotion {
  id: string;
  title: string;
  description?: string;
  discount: number;
  startDate: string;
  endDate: string;
}

const adminService = {
  // ─── CATEGORIES ───────────────────────────────────
  
  /**
   * Récupérer toutes les catégories
   */
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/admin/categories');
    return response.data.categories;
  },

  /**
   * Créer une catégorie
   */
  createCategory: async (data: Omit<Category, 'id'>): Promise<Category> => {
    const response = await api.post('/admin/categories', data);
    return response.data.category;
  },

  /**
   * Mettre à jour une catégorie
   */
  updateCategory: async (id: string, data: Partial<Category>): Promise<Category> => {
    const response = await api.put(`/admin/categories/${id}`, data);
    return response.data.category;
  },

  /**
   * Supprimer une catégorie
   */
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/admin/categories/${id}`);
  },

  // ─── DUREES ───────────────────────────────────

  /**
   * Récupérer les durées d'une catégorie
   */
  getDurees: async (categoryId: string): Promise<Duree[]> => {
    const response = await api.get(`/admin/categories/${categoryId}/durees`);
    return response.data.durees;
  },

  /**
   * Créer une durée
   */
  createDuree: async (categoryId: string, data: Omit<Duree, 'id'>): Promise<Duree> => {
    const response = await api.post(`/admin/categories/${categoryId}/durees`, data);
    return response.data.duree;
  },

  /**
   * Mettre à jour une durée
   */
  updateDuree: async (categoryId: string, id: string, data: Partial<Duree>): Promise<Duree> => {
    const response = await api.put(`/admin/categories/${categoryId}/durees/${id}`, data);
    return response.data.duree;
  },

  /**
   * Supprimer une durée
   */
  deleteDuree: async (categoryId: string, id: string): Promise<void> => {
    await api.delete(`/admin/categories/${categoryId}/durees/${id}`);
  },

  // ─── POSTES ───────────────────────────────────

  /**
   * Récupérer tous les postes
   */
  getPostes: async (): Promise<Poste[]> => {
    const response = await api.get('/admin/postes');
    return response.data.postes;
  },

  /**
   * Créer un poste
   */
  createPoste: async (data: Omit<Poste, 'id'>): Promise<Poste> => {
    const response = await api.post('/admin/postes', data);
    return response.data.poste;
  },

  /**
   * Mettre à jour un poste
   */
  updatePoste: async (id: string, data: Partial<Poste>): Promise<Poste> => {
    const response = await api.put(`/admin/postes/${id}`, data);
    return response.data.poste;
  },

  /**
   * Supprimer un poste
   */
  deletePoste: async (id: string): Promise<void> => {
    await api.delete(`/admin/postes/${id}`);
  },

  // ─── GERANTS ───────────────────────────────────

  /**
   * Récupérer tous les gérants
   */
  getGerants: async (): Promise<Gerant[]> => {
    const response = await api.get('/admin/gerants');
    return response.data.gerants;
  },

  /**
   * Créer un gérant
   */
  createGerant: async (data: Omit<Gerant, 'id'>): Promise<Gerant> => {
    const response = await api.post('/admin/gerants', data);
    return response.data.gerant;
  },

  /**
   * Mettre à jour un gérant
   */
  updateGerant: async (id: string, data: Partial<Gerant>): Promise<Gerant> => {
    const response = await api.put(`/admin/gerants/${id}`, data);
    return response.data.gerant;
  },

  /**
   * Supprimer un gérant
   */
  deleteGerant: async (id: string): Promise<void> => {
    await api.delete(`/admin/gerants/${id}`);
  },

  // ─── BONUS ───────────────────────────────────

  /**
   * Récupérer tous les bonus
   */
  getBonus: async (): Promise<Bonus[]> => {
    const response = await api.get('/admin/bonus');
    return response.data.bonus;
  },

  /**
   * Créer un bonus
   */
  createBonus: async (data: Omit<Bonus, 'id'>): Promise<Bonus> => {
    const response = await api.post('/admin/bonus', data);
    return response.data.bonus;
  },

  /**
   * Mettre à jour un bonus
   */
  updateBonus: async (id: string, data: Partial<Bonus>): Promise<Bonus> => {
    const response = await api.put(`/admin/bonus/${id}`, data);
    return response.data.bonus;
  },

  /**
   * Supprimer un bonus
   */
  deleteBonus: async (id: string): Promise<void> => {
    await api.delete(`/admin/bonus/${id}`);
  },

  // ─── PROMO ───────────────────────────────────

  /**
   * Récupérer toutes les promos
   */
  getPromos: async (): Promise<Promotion[]> => {
    const response = await api.get('/admin/promo');
    return response.data.promos;
  },

  /**
   * Créer une promo
   */
  createPromo: async (data: Omit<Promotion, 'id'>): Promise<Promotion> => {
    const response = await api.post('/admin/promo', data);
    return response.data.promo;
  },

  /**
   * Mettre à jour une promo
   */
  updatePromo: async (id: string, data: Partial<Promotion>): Promise<Promotion> => {
    const response = await api.put(`/admin/promo/${id}`, data);
    return response.data.promo;
  },

  /**
   * Supprimer une promo
   */
  deletePromo: async (id: string): Promise<void> => {
    await api.delete(`/admin/promo/${id}`);
  },

  // ─── COUPONS ───────────────────────────────────

  /**
   * Récupérer tous les coupons
   */
  getCoupons: async (): Promise<Coupon[]> => {
    const response = await api.get('/admin/coupons');
    return response.data.coupons;
  },

  /**
   * Créer un coupon
   */
  createCoupon: async (data: Omit<Coupon, 'id'>): Promise<Coupon> => {
    const response = await api.post('/admin/coupons', data);
    return response.data.coupon;
  },

  /**
   * Mettre à jour un coupon
   */
  updateCoupon: async (id: string, data: Partial<Coupon>): Promise<Coupon> => {
    const response = await api.put(`/admin/coupons/${id}`, data);
    return response.data.coupon;
  },

  /**
   * Supprimer un coupon
   */
  deleteCoupon: async (id: string): Promise<void> => {
    await api.delete(`/admin/coupons/${id}`);
  },

  // ─── PROMOTIONS ───────────────────────────────────

  /**
   * Récupérer toutes les promotions
   */
  getPromotions: async (): Promise<Promotion[]> => {
    const response = await api.get('/admin/promotions');
    return response.data.promotions;
  },

  /**
   * Créer une promotion
   */
  createPromotion: async (data: Omit<Promotion, 'id'>): Promise<Promotion> => {
    const response = await api.post('/admin/promotions', data);
    return response.data.promotion;
  },

  /**
   * Mettre à jour une promotion
   */
  updatePromotion: async (id: string, data: Partial<Promotion>): Promise<Promotion> => {
    const response = await api.put(`/admin/promotions/${id}`, data);
    return response.data.promotion;
  },

  /**
   * Supprimer une promotion
   */
  deletePromotion: async (id: string): Promise<void> => {
    await api.delete(`/admin/promotions/${id}`);
  },

  // ─── RAPPORTS ───────────────────────────────────

  /**
   * Récupérer les rapports
   */
  getRapports: async (): Promise<any[]> => {
    const response = await api.get('/admin/rapports');
    return response.data.rapports;
  },
};

export default adminService;
