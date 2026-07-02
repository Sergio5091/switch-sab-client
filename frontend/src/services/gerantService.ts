import api from './api';

export interface Client {
  id: number;
  pseudo: string;
  telephone?: string;
  email?: string;
  nom?: string;
  prenom?: string;
  estEnfant: boolean;
  active: boolean;
  createdAt: string;
  solde?: number;
  credits: { id: number; solde: number; categorie: { id: number; nom: string } }[];
  bonus?: { solde: number; disponible: boolean };
}

export interface Session {
  id: number;
  clientId: number | null;
  clientPseudo?: string;
  posteId: number;
  dureeId: number;
  fin: string;
  statut: 'ACTIVE' | 'ARRETEE' | 'TERMINEE';
  estBonus: boolean;
  debut: string;
  client: { pseudo: string; telephone: string };
  poste: { id: number; nom: string };
  duree: { libelle: string; secondes: number; prix: number };
}

export interface Recharge {
  id: number;
  clientId: number;
  client: { pseudo: string; telephone: string };
  montant: number;
  date: string;
  type: string;
}

export interface Categorie {
  id: number;
  nom: string;
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
  statut: 'LIBRE' | 'OCCUPE';
  categorieId: number;
  categorie: { id: number; nom: string };
}

export interface RapportJour {
  date: string;
  gerant: string;
  resume: {
    totalSessions: number;
    totalMontantSessions: number;
    totalMontantRecharges: number;
    totalMontantJour: number;
    totalSecondes: string;
    sessionNormale: number;
    sessionBonus: number;
  };
  parCategorie: Record<string, { nombre: number; montant: number; secondes: number }>;
  parClient: Record<string, { nombre: number; montant: number; telephone: string; estEnfant: boolean }>;
  sessions: {
    id: number;
    client: string;
    poste: string;
    categorie: string;
    duree: string;
    montant: number;
    debut: string;
    fin?: string;
    statut: string;
    tempsRestant: number;
    estBonus: boolean;
  }[];
  recharges: {
    id: number;
    client: string;
    telephone: string;
    montant: number;
    date: string;
    creditsActuels: { categorie: string; soldeMinutes: number; soldeSecondes: number }[];
  }[];
  // Rétrocompatibilité : detail = sessions
  detail?: {
    id: number;
    client: string;
    poste: string;
    categorie: string;
    duree: string;
    montant: number;
    debut: string;
    fin?: string;
    statut: string;
    estBonus: boolean;
  }[];
}

const gerantService = {
  // ─── CLIENTS ──────────────────────────────────────────────────────────────

  getClients: async (): Promise<Client[]> => {
    const res = await api.get('/gerant/clients');
    return res.data;
  },

  getClient: async (id: number): Promise<Client> => {
    const res = await api.get(`/gerant/clients/${id}`);
    return res.data;
  },

  createClient: async (data: { pseudo: string; motDePasse: string; telephone?: string; estEnfant?: boolean; codeParrainage?: string }): Promise<{ id: number; pseudo: string; telephone?: string }> => {
    const res = await api.post('/gerant/clients', data);
    return res.data;
  },

  updateClient: async (id: number, data: { pseudo?: string; telephone?: string; email?: string; nom?: string; prenom?: string; estEnfant?: boolean; active?: boolean }): Promise<Client> => {
    const res = await api.patch(`/gerant/clients/${id}`, data);
    return res.data;
  },

  // ─── SESSIONS ─────────────────────────────────────────────────────────────

  getSessions: async (): Promise<Session[]> => {
    const res = await api.get('/gerant/sessions');
    return res.data;
  },

  demarrerSession: async (data: { clientId: number; categorieId: number; dureeId: number; useBonus?: boolean }): Promise<Session> => {
    const res = await api.post('/gerant/sessions', data);
    return res.data.session;
  },

  arreterSession: async (id: number): Promise<{ tempsRestantConserve: number }> => {
    const res = await api.post(`/gerant/sessions/${id}/arreter`);
    return res.data;
  },

  // ─── RECHARGES ────────────────────────────────────────────────────────────

  getRechargesEnAttente: async (): Promise<Recharge[]> => {
    const res = await api.get('/gerant/recharges/en-attente');
    return res.data;
  },

  getHistoriqueRecharges: async (params?: { clientId?: number; date?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.clientId) query.set('clientId', String(params.clientId));
    if (params?.date) query.set('date', params.date);
    const qs = query.toString();
    const res = await api.get(`/gerant/recharges${qs ? '?' + qs : ''}`);
    return res.data;
  },

  creerRecharge: async (data: { clientId: number; categorieId: number; dureeId: number; montant: number }): Promise<any> => {
    const res = await api.post('/gerant/recharges', data);
    return res.data;
  },

  validerRecharge: async (id: number): Promise<any> => {
    const res = await api.post(`/gerant/recharges/${id}/valider`);
    return res.data;
  },

  // ─── POSTES ───────────────────────────────────────────────────────────────

  getPostes: async (): Promise<Poste[]> => {
    const res = await api.get('/gerant/sessions');
    // On réutilise les sessions pour savoir quels postes sont occupés
    return res.data;
  },

  // ─── CATEGORIES & DUREES (via admin routes) ───────────────────────────────

  getCategories: async (): Promise<Categorie[]> => {
    const res = await api.get('/gerant/categories');
    return res.data;
  },

  getDurees: async (categorieId: number): Promise<Duree[]> => {
    const res = await api.get(`/gerant/categories/${categorieId}/durees`);
    return res.data;
  },

  getPostesDisponibles: async (): Promise<Poste[]> => {
    const res = await api.get('/gerant/postes');
    return res.data;
  },

  // ─── RAPPORT ──────────────────────────────────────────────────────────────

  getRapportJour: async (): Promise<RapportJour> => {
    const res = await api.get('/gerant/rapport/jour');
    return res.data;
  },
};

export default gerantService;
