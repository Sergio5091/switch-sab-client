import api from './api';

export interface Categorie {
  id: number;
  nom: string;
  salleId: number;
}

export interface Duree {
  id: number;
  libelle: string;
  secondes: number;
  prix: number;
  categorieId: number;
}

export interface Poste {
  id: number;
  nom: string;
  image?: string;
  statut: 'LIBRE' | 'OCCUPE';
  categorieId: number;
  zigbeeName?: string | null; // friendly_name de la prise Zigbee liée (null = pas encore appairée)
}

export interface Gerant {
  id: number;
  pseudo: string;
  email?: string;
  nom?: string;
  prenom?: string;
  telephone: string;
  role: string;
  salleId?: number;
  active: boolean;
  telUrgence?: string;
}

export interface ConfigBonus {
  id: number;
  salleId: number;
  ratioSecondes: number;
  seuilDeblocage: number;
  validitejours: number;
  reductionInvite: number;
  bonusParrain: number;  // montant FCFA offert au parrain
  bonusFilleul: number;  // montant FCFA offert au filleul
}

export interface PromoConfig {
  salleId: number;
  reductionInvite: number;
  bonusParrain: number;
  bonusFilleul: number;
}

export interface Coupon {
  id: number;
  code: string;
  valeur: number;
  utilise: boolean;
  salleId: number;
  createdAt: string;
}

export interface Promotion {
  id: number;
  titre: string;
  message?: string;
  image?: string;
  salleId: number;
  createdAt: string;
  envoyee: boolean;
}

const adminService = {
  // ─── DASHBOARD ───────────────────────────────────

  getDashboard: async (): Promise<{
    stats: {
      sessionsAujourdhui: number;
      revenuJour: number;
      postes: { total: number; actifs: number };
      clients: number;
    };
    categories: { id: number; nom: string; nbPostes: number; nbActifs: number }[];
    gerantActivity: { gerant: { id: number; nom?: string; prenom?: string }; nbSessions: number; revenu: number }[];
  }> => {
    const res = await api.get('/admin/dashboard');
    return res.data;
  },

  // ─── CATEGORIES ───────────────────────────────────────────────────────────

  getCategories: async (): Promise<Categorie[]> => {
    const res = await api.get('/admin/categories');
    return res.data;
  },

  createCategorie: async (data: { nom: string }): Promise<Categorie> => {
    const res = await api.post('/admin/categories', data);
    return res.data;
  },

  updateCategorie: async (id: number, data: { nom?: string }): Promise<Categorie> => {
    const res = await api.patch(`/admin/categories/${id}`, data);
    return res.data;
  },

  deleteCategorie: async (id: number): Promise<void> => {
    await api.delete(`/admin/categories/${id}`);
  },

  // ─── DUREES ───────────────────────────────────────────────────────────────

  getDurees: async (categorieId: number): Promise<Duree[]> => {
    const res = await api.get(`/admin/categories/${categorieId}/durees`);
    return res.data;
  },

  createDuree: async (categorieId: number, data: { libelle: string; secondes: number; prix: number }): Promise<Duree> => {
    const res = await api.post(`/admin/categories/${categorieId}/durees`, data);
    return res.data;
  },

  updateDuree: async (id: number, data: { libelle?: string; secondes?: number; prix?: number }): Promise<Duree> => {
    const res = await api.patch(`/admin/durees/${id}`, data);
    return res.data;
  },

  deleteDuree: async (id: number): Promise<void> => {
    await api.delete(`/admin/durees/${id}`);
  },

  // ─── POSTES ───────────────────────────────────────────────────────────────

  getPostes: async (): Promise<Poste[]> => {
    const res = await api.get('/admin/postes');
    return res.data;
  },

  createPoste: async (data: { nom: string; categorieId: number; image?: string }): Promise<Poste> => {
    const res = await api.post('/admin/postes', data);
    return res.data;
  },

  updatePoste: async (id: number, data: { nom?: string; categorieId?: number; image?: string }): Promise<Poste> => {
    const res = await api.patch(`/admin/postes/${id}`, data);
    return res.data;
  },

  deletePoste: async (id: number): Promise<void> => {
    await api.delete(`/admin/postes/${id}`);
  },

  // ─── GERANTS ──────────────────────────────────────────────────────────────

  getGerants: async (): Promise<Gerant[]> => {
    const res = await api.get('/admin/gerants');
    return res.data;
  },

  createGerant: async (data: { pseudo: string; telephone: string; motDePasse: string; nom?: string; prenom?: string; email?: string; telUrgence?: string }): Promise<Gerant> => {
    const res = await api.post('/admin/gerants', data);
    return res.data;
  },

  updateGerant: async (id: number, data: { pseudo?: string; telephone?: string; nom?: string; prenom?: string; email?: string; active?: boolean; telUrgence?: string }): Promise<Gerant> => {
    const res = await api.patch(`/admin/gerants/${id}`, data);
    return res.data;
  },

  // ─── CONFIG BONUS ─────────────────────────────────────────────────────────

  getConfigBonus: async (): Promise<ConfigBonus> => {
    const res = await api.get('/admin/bonus/config');
    return res.data;
  },

  createConfigBonus: async (data: { ratioSecondes: number; seuilDeblocage: number; validitejours?: number; reductionInvite?: number; bonusParrain?: number }): Promise<ConfigBonus> => {
    const res = await api.post('/admin/bonus/config', data);
    return res.data;
  },

  updateConfigBonus: async (data: { ratioSecondes?: number; seuilDeblocage?: number; validitejours?: number; reductionInvite?: number; bonusParrain?: number; bonusFilleul?: number }): Promise<ConfigBonus> => {
    const res = await api.patch('/admin/bonus/config', data);
    return res.data;
  },

  // ─── CONFIG PROMO ─────────────────────────────────────────────────────────

  getPromoConfig: async (): Promise<PromoConfig> => {
    const res = await api.get('/admin/promo/config');
    return res.data;
  },

  updatePromoConfig: async (data: { reductionInvite?: number; bonusParrain?: number; bonusFilleul?: number }): Promise<PromoConfig> => {
    const res = await api.patch('/admin/promo/config', data);
    return res.data;
  },

  // ─── COUPONS ──────────────────────────────────────────────────────────────

  getCoupons: async (statut?: 'actif' | 'utilise'): Promise<Coupon[]> => {
    const params = statut ? `?statut=${statut}` : '';
    const res = await api.get(`/admin/coupons${params}`);
    return res.data;
  },

  genererCoupons: async (data: { nombre: number; valeur: number }): Promise<Coupon[]> => {
    const res = await api.post('/admin/coupons/generer', data);
    return res.data;
  },

  exportCouponsPdf: async (): Promise<Blob> => {
    const res = await api.get('/admin/coupons/pdf', { responseType: 'blob' });
    return res.data;
  },

  // ─── PROMOTIONS ───────────────────────────────────────────────────────────

  getPromotions: async (): Promise<Promotion[]> => {
    const res = await api.get('/admin/promotions');
    return res.data;
  },

  createPromotion: async (data: { titre: string; message?: string; image?: string }): Promise<Promotion> => {
    const res = await api.post('/admin/promotions', data);
    return res.data;
  },

  envoyerPromotion: async (id: number): Promise<void> => {
    await api.post(`/admin/promotions/${id}/envoyer`);
  },

  // ─── ZIGBEE — appairage des prises ───────────────────────────────────────

  /**
   * Lance l'appairage Zigbee pour un poste.
   * Le backend ouvre permit_join 120s et attend qu'une prise se connecte.
   * Résout quand la prise est détectée et liée, rejette en timeout (408).
   */
  appairerPrise: async (posteId: number): Promise<{ success: boolean; zigbeeName: string; message: string }> => {
    const res = await api.post(`/admin/zigbee/appairer/${posteId}`, {}, { timeout: 130_000 });
    return res.data;
  },

  /**
   * Retire le lien entre un poste et sa prise Zigbee.
   */
  desappairerPrise: async (posteId: number): Promise<void> => {
    await api.delete(`/admin/zigbee/desappairer/${posteId}`);
  },

  /**
   * Fait clignoter physiquement la LED de la prise liée au poste.
   */
  identifierPrise: async (posteId: number): Promise<void> => {
    await api.post(`/admin/zigbee/identifier/${posteId}`);
  },

  getStatutContacts: async (): Promise<{ totalClients: number; nouveauxClients: number; dernierExport: string | null }> => {
    const res = await api.get('/admin/contacts/statut');
    return res.data;
  },

  exportContacts: async (): Promise<void> => {
    const res = await api.get('/admin/contacts/export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/vcard' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients_switch_sab.vcf';
    a.click();
    URL.revokeObjectURL(url);
  },

  exportNouveauxContacts: async (): Promise<void> => {
    const res = await api.get('/admin/contacts/export/nouveaux', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/vcard' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nouveaux_clients_switch_sab.vcf';
    a.click();
    URL.revokeObjectURL(url);
  },
};

export default adminService;
