import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { axiosInstance } from "@/lib/axios";

export type Role = "superadmin" | "admin" | "gerant" | "client";

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  pseudo: string;
  email: string;
  phone: string;
  role: Role;
  salleId: number;
  actif: boolean;
  password: string;
}

export interface Salle {
  id: number;
  nom: string;
  pays: string;
  ville: string;
  quartier: string;
  telephone: string;
  licenceExpiry: string;
  adminId: number;
}

export interface Categorie {
  id: number;
  nom: string;
  salleId: number;
  couleur: string;
}

export interface DureePrix {
  id: number;
  categorieId: number;
  duree: string;
  dureeMinutes: number;
  prix: number;
}

export interface Poste {
  id: number;
  numero: number;
  categorieId: number;
  typeSwitch: "USB" | "WIFI";
  salleId: number;
  actif: boolean;
}

export interface Client {
  id: number;
  pseudo: string;
  phone: string;
  enfant: boolean;
  codeEnfant?: string;
  creditMonetaire: number;
  bonusTempsDispo: number;
  creditPromo: number;
  salleId: number;
  codePromo: string;
  totalAchats: number;
}

export interface Session {
  id: number;
  clientId: number;
  posteId: number;
  gerantId: number;
  dureeAchetee: string;
  dureeMinutes: number;
  heureDebut: string;
  heureFin: string | null;
  montant: number;
  estBonus: boolean;
  salleId: number;
  actif: boolean;
  secondsRemaining: number;
}

export interface Recharge {
  id: number;
  clientId: number;
  montant: number;
  statut: "en_attente" | "validee";
  heureCreation: string;
  gerantValidateur?: number;
}

export interface Coupon {
  id: number;
  code: string;
  valeur: number;
  statut: "actif" | "utilise";
  salleId: number;
  utilisePar?: number;
}

export interface Licence {
  id: number;
  salleId: number;
  codeGenere: string;
  joursRestants: number;
  dateExpiry: string;
}

export interface Promotion {
  id: number;
  salleId: number;
  texte: string;
  dateCreation: string;
  envoye: boolean;
}

export interface BonusConfig {
  salleId: number;
  ratioJeu: number;
  ratioBonus: number;
  seuilMinutes: number;
  validiteMois: number;
}

export interface PromoConfig {
  salleId: number;
  bonusParrainPct: number;
  reductionInvitePct: number;
}

interface AppContextType {
  currentUser: Utilisateur | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  salles: Salle[];
  addSalle: (s: Omit<Salle, "id">) => void;
  updateSalle: (id: number, s: Partial<Salle>) => void;
  deleteSalle: (id: number) => void;

  utilisateurs: Utilisateur[];
  addUtilisateur: (u: Omit<Utilisateur, "id">) => void;
  updateUtilisateur: (id: number, u: Partial<Utilisateur>) => void;
  deleteUtilisateur: (id: number) => void;

  categories: Categorie[];
  addCategorie: (c: Omit<Categorie, "id">) => void;
  updateCategorie: (id: number, c: Partial<Categorie>) => void;
  deleteCategorie: (id: number) => void;

  dureesPrix: DureePrix[];
  addDureePrix: (d: Omit<DureePrix, "id">) => void;
  updateDureePrix: (id: number, d: Partial<DureePrix>) => void;
  deleteDureePrix: (id: number) => void;

  postes: Poste[];
  addPoste: (p: Omit<Poste, "id">) => void;
  updatePoste: (id: number, p: Partial<Poste>) => void;
  deletePoste: (id: number) => void;

  clients: Client[];
  addClient: (c: Omit<Client, "id" | "codePromo" | "totalAchats">) => void;
  updateClient: (id: number, c: Partial<Client>) => void;

  sessions: Session[];
  addSession: (s: Omit<Session, "id">) => Session;
  stopSession: (id: number) => void;
  tickSessions: () => void;

  recharges: Recharge[];
  addRecharge: (r: Omit<Recharge, "id">) => void;
  validerRecharge: (id: number, gerantId: number) => void;

  coupons: Coupon[];
  genererCoupons: (salleId: number, valeur: number, count: number) => void;
  utiliserCoupon: (code: string, clientId: number) => boolean;

  licences: Licence[];
  genererLicence: (salleId: number, code: string) => void;

  promotions: Promotion[];
  addPromotion: (p: Omit<Promotion, "id" | "dateCreation" | "envoye">) => void;
  envoyerPromotion: (id: number) => void;

  bonusConfigs: BonusConfig[];
  updateBonusConfig: (salleId: number, c: Partial<BonusConfig>) => void;

  promoConfigs: PromoConfig[];
  updatePromoConfig: (salleId: number, c: Partial<PromoConfig>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const MOCK_SALLES: Salle[] = [
  { id: 1, nom: "SWITCH Cotonou", pays: "Bénin", ville: "Cotonou", quartier: "Cadjehoun", telephone: "+229 0197691879", licenceExpiry: "2026-09-15", adminId: 2 },
  { id: 2, nom: "SWITCH Porto-Novo", pays: "Bénin", ville: "Porto-Novo", quartier: "Tokpota", telephone: "+229 0197691880", licenceExpiry: "2026-07-20", adminId: 3 },
  { id: 3, nom: "SWITCH Parakou", pays: "Bénin", ville: "Parakou", quartier: "Zongo", telephone: "+229 0197691881", licenceExpiry: "2025-12-31", adminId: 4 },
];

const MOCK_UTILISATEURS: Utilisateur[] = [
  { id: 1, nom: "Dupont", prenom: "Jean", pseudo: "superadmin", email: "superadmin@switch.bj", phone: "+229 0100000001", role: "superadmin", salleId: 1, actif: true, password: "admin123" },
  { id: 2, nom: "Ahounou", prenom: "Marc", pseudo: "admin_cotonou", email: "admin@switch.bj", phone: "+229 0100000002", role: "admin", salleId: 1, actif: true, password: "admin123" },
  { id: 3, nom: "Gbedji", prenom: "Sonia", pseudo: "admin_pn", email: "admin2@switch.bj", phone: "+229 0100000003", role: "admin", salleId: 2, actif: true, password: "admin123" },
  { id: 4, nom: "Koto", prenom: "Alexis", pseudo: "admin_para", email: "admin3@switch.bj", phone: "+229 0100000004", role: "admin", salleId: 3, actif: true, password: "admin123" },
  { id: 5, nom: "Dossou", prenom: "Raoul", pseudo: "gerant1", email: "gerant@switch.bj", phone: "+229 0100000005", role: "gerant", salleId: 1, actif: true, password: "admin123" },
  { id: 6, nom: "Fadonougbo", prenom: "Prisca", pseudo: "gerant2", email: "gerant2@switch.bj", phone: "+229 0100000006", role: "gerant", salleId: 1, actif: true, password: "admin123" },
  { id: 7, nom: "Guezodje", prenom: "Kevin", pseudo: "KevG", email: "client@switch.bj", phone: "+229 0100000007", role: "client", salleId: 1, actif: true, password: "admin123" },
];

const MOCK_CATEGORIES: Categorie[] = [
  { id: 1, nom: "PS4", salleId: 1, couleur: "#3B82F6" },
  { id: 2, nom: "PS5", salleId: 1, couleur: "#F97316" },
  { id: 3, nom: "PC", salleId: 1, couleur: "#22C55E" },
  { id: 4, nom: "XBOX", salleId: 1, couleur: "#A855F7" },
  { id: 5, nom: "PS4", salleId: 2, couleur: "#3B82F6" },
  { id: 6, nom: "PS5", salleId: 2, couleur: "#F97316" },
  { id: 7, nom: "PS4", salleId: 3, couleur: "#3B82F6" },
  { id: 8, nom: "PC", salleId: 3, couleur: "#22C55E" },
];

const MOCK_DUREES_PRIX: DureePrix[] = [
  { id: 1, categorieId: 1, duree: "30 min", dureeMinutes: 30, prix: 250 },
  { id: 2, categorieId: 1, duree: "1H", dureeMinutes: 60, prix: 500 },
  { id: 3, categorieId: 1, duree: "2H", dureeMinutes: 120, prix: 900 },
  { id: 4, categorieId: 2, duree: "30 min", dureeMinutes: 30, prix: 400 },
  { id: 5, categorieId: 2, duree: "1H", dureeMinutes: 60, prix: 750 },
  { id: 6, categorieId: 2, duree: "2H", dureeMinutes: 120, prix: 1400 },
  { id: 7, categorieId: 3, duree: "1H", dureeMinutes: 60, prix: 600 },
  { id: 8, categorieId: 3, duree: "2H", dureeMinutes: 120, prix: 1100 },
  { id: 9, categorieId: 4, duree: "1H", dureeMinutes: 60, prix: 700 },
  { id: 10, categorieId: 4, duree: "2H", dureeMinutes: 120, prix: 1300 },
];

const MOCK_POSTES: Poste[] = [
  { id: 1, numero: 1, categorieId: 2, typeSwitch: "WIFI", salleId: 1, actif: true },
  { id: 2, numero: 2, categorieId: 2, typeSwitch: "WIFI", salleId: 1, actif: true },
  { id: 3, numero: 3, categorieId: 1, typeSwitch: "USB", salleId: 1, actif: true },
  { id: 4, numero: 4, categorieId: 1, typeSwitch: "USB", salleId: 1, actif: true },
  { id: 5, numero: 5, categorieId: 1, typeSwitch: "USB", salleId: 1, actif: true },
  { id: 6, numero: 6, categorieId: 3, typeSwitch: "WIFI", salleId: 1, actif: true },
  { id: 7, numero: 7, categorieId: 3, typeSwitch: "WIFI", salleId: 1, actif: true },
  { id: 8, numero: 8, categorieId: 4, typeSwitch: "USB", salleId: 1, actif: false },
  { id: 9, numero: 1, categorieId: 5, typeSwitch: "USB", salleId: 2, actif: true },
  { id: 10, numero: 2, categorieId: 5, typeSwitch: "WIFI", salleId: 2, actif: true },
  { id: 11, numero: 1, categorieId: 7, typeSwitch: "USB", salleId: 3, actif: true },
  { id: 12, numero: 2, categorieId: 8, typeSwitch: "WIFI", salleId: 3, actif: true },
];

const MOCK_CLIENTS: Client[] = [
  { id: 1, pseudo: "KevG", phone: "+229 0100000007", enfant: false, creditMonetaire: 2500, bonusTempsDispo: 15, creditPromo: 0, salleId: 1, codePromo: "KEVG-X4F2", totalAchats: 12500 },
  { id: 2, pseudo: "Steph_BJ", phone: "+229 0100000010", enfant: false, creditMonetaire: 800, bonusTempsDispo: 0, creditPromo: 200, salleId: 1, codePromo: "STEPH-B7K1", totalAchats: 7800 },
  { id: 3, pseudo: "LittleMax", phone: "+229 0100000011", enfant: true, codeEnfant: "MAX2014", creditMonetaire: 1500, bonusTempsDispo: 30, creditPromo: 0, salleId: 1, codePromo: "MAX-Z9P3", totalAchats: 4200 },
  { id: 4, pseudo: "Pro_Gamer", phone: "+229 0100000012", enfant: false, creditMonetaire: 5000, bonusTempsDispo: 60, creditPromo: 500, salleId: 1, codePromo: "PRO-Q2W8", totalAchats: 28900 },
  { id: 5, pseudo: "Aminata_G", phone: "+229 0100000013", enfant: false, creditMonetaire: 300, bonusTempsDispo: 0, creditPromo: 0, salleId: 1, codePromo: "AMI-R5T6", totalAchats: 1500 },
];

const now = new Date();
const MOCK_SESSIONS: Session[] = [
  {
    id: 1,
    clientId: 1,
    posteId: 1,
    gerantId: 5,
    dureeAchetee: "1H",
    dureeMinutes: 60,
    heureDebut: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
    heureFin: null,
    montant: 750,
    estBonus: false,
    salleId: 1,
    actif: true,
    secondsRemaining: 35 * 60,
  },
  {
    id: 2,
    clientId: 4,
    posteId: 3,
    gerantId: 5,
    dureeAchetee: "2H",
    dureeMinutes: 120,
    heureDebut: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
    heureFin: null,
    montant: 900,
    estBonus: false,
    salleId: 1,
    actif: true,
    secondsRemaining: 80 * 60,
  },
  {
    id: 3,
    clientId: 2,
    posteId: 6,
    gerantId: 5,
    dureeAchetee: "1H",
    dureeMinutes: 60,
    heureDebut: new Date(now.getTime() - 65 * 60 * 1000).toISOString(),
    heureFin: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    montant: 600,
    estBonus: false,
    salleId: 1,
    actif: false,
    secondsRemaining: 0,
  },
  {
    id: 4,
    clientId: 3,
    posteId: 4,
    gerantId: 6,
    dureeAchetee: "30 min",
    dureeMinutes: 30,
    heureDebut: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
    heureFin: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    montant: 500,
    estBonus: true,
    salleId: 1,
    actif: false,
    secondsRemaining: 0,
  },
];

const MOCK_RECHARGES: Recharge[] = [
  { id: 1, clientId: 5, montant: 1000, statut: "en_attente", heureCreation: new Date(now.getTime() - 10 * 60 * 1000).toISOString() },
  { id: 2, clientId: 2, montant: 2000, statut: "en_attente", heureCreation: new Date(now.getTime() - 25 * 60 * 1000).toISOString() },
  { id: 3, clientId: 1, montant: 1500, statut: "validee", heureCreation: new Date(now.getTime() - 120 * 60 * 1000).toISOString(), gerantValidateur: 5 },
];

const MOCK_COUPONS: Coupon[] = [
  { id: 1, code: "SW-A1B2C3", valeur: 500, statut: "actif", salleId: 1 },
  { id: 2, code: "SW-D4E5F6", valeur: 500, statut: "actif", salleId: 1 },
  { id: 3, code: "SW-G7H8I9", valeur: 1000, statut: "actif", salleId: 1 },
  { id: 4, code: "SW-J1K2L3", valeur: 1000, statut: "utilise", salleId: 1, utilisePar: 1 },
  { id: 5, code: "SW-M4N5P6", valeur: 500, statut: "utilise", salleId: 1, utilisePar: 2 },
];

const MOCK_LICENCES: Licence[] = [
  { id: 1, salleId: 1, codeGenere: "LIC-2025-CTNU-XK9F", joursRestants: 110, dateExpiry: "2026-09-15" },
  { id: 2, salleId: 2, codeGenere: "LIC-2025-PNOV-MZ3T", joursRestants: 53, dateExpiry: "2026-07-20" },
  { id: 3, salleId: 3, codeGenere: "LIC-2025-PARU-BW7R", joursRestants: 8, dateExpiry: "2025-12-31" },
];

const MOCK_PROMOTIONS: Promotion[] = [
  { id: 1, salleId: 1, texte: "Ce weekend : 2H achetées = 30 min offertes sur PS5 ! Valable sam. et dim.", dateCreation: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), envoye: true },
  { id: 2, salleId: 1, texte: "Nouveau ! Pack famille : 3H PS4 à 1200F au lieu de 1500F.", dateCreation: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), envoye: false },
];

const MOCK_BONUS_CONFIGS: BonusConfig[] = [
  { salleId: 1, ratioJeu: 60, ratioBonus: 5, seuilMinutes: 60, validiteMois: 1 },
  { salleId: 2, ratioJeu: 60, ratioBonus: 5, seuilMinutes: 60, validiteMois: 1 },
  { salleId: 3, ratioJeu: 60, ratioBonus: 5, seuilMinutes: 60, validiteMois: 1 },
];

const MOCK_PROMO_CONFIGS: PromoConfig[] = [
  { salleId: 1, bonusParrainPct: 10, reductionInvitePct: 5 },
  { salleId: 2, bonusParrainPct: 10, reductionInvitePct: 5 },
  { salleId: 3, bonusParrainPct: 10, reductionInvitePct: 5 },
];

let nextId = 1000;
const genId = () => ++nextId;

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "SW-" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(() => {
    try {
      const stored = localStorage.getItem("switch_sab_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [salles, setSalles] = useState<Salle[]>(MOCK_SALLES);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>(MOCK_UTILISATEURS);
  const [categories, setCategories] = useState<Categorie[]>(MOCK_CATEGORIES);
  const [dureesPrix, setDureesPrix] = useState<DureePrix[]>(MOCK_DUREES_PRIX);
  const [postes, setPostes] = useState<Poste[]>(MOCK_POSTES);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
  const [recharges, setRecharges] = useState<Recharge[]>(MOCK_RECHARGES);
  const [coupons, setCoupons] = useState<Coupon[]>(MOCK_COUPONS);
  const [licences, setLicences] = useState<Licence[]>(MOCK_LICENCES);
  const [promotions, setPromotions] = useState<Promotion[]>(MOCK_PROMOTIONS);
  const [bonusConfigs, setBonusConfigs] = useState<BonusConfig[]>(MOCK_BONUS_CONFIGS);
  const [promoConfigs, setPromoConfigs] = useState<PromoConfig[]>(MOCK_PROMO_CONFIGS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prev =>
        prev.map(s => {
          if (!s.actif || s.secondsRemaining <= 0) return s;
          const newSecs = s.secondsRemaining - 1;
          if (newSecs <= 0) {
            return { ...s, secondsRemaining: 0, actif: false, heureFin: new Date().toISOString() };
          }
          return { ...s, secondsRemaining: newSecs };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      // Appel au backend
      const response = await axiosInstance.post('/auth/login', {
        email,
        motDePasse: password
      });

      if (response.data && response.data.token && response.data.user) {
        const user = response.data.user;
        setCurrentUser(user);
        localStorage.setItem("switch_sab_user", JSON.stringify(user));
        localStorage.setItem("authToken", response.data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("switch_sab_user");
  }, []);

  const addSalle = (s: Omit<Salle, "id">) => setSalles(prev => [...prev, { ...s, id: genId() }]);
  const updateSalle = (id: number, s: Partial<Salle>) => setSalles(prev => prev.map(x => x.id === id ? { ...x, ...s } : x));
  const deleteSalle = (id: number) => setSalles(prev => prev.filter(x => x.id !== id));

  const addUtilisateur = (u: Omit<Utilisateur, "id">) => setUtilisateurs(prev => [...prev, { ...u, id: genId() }]);
  const updateUtilisateur = (id: number, u: Partial<Utilisateur>) => setUtilisateurs(prev => prev.map(x => x.id === id ? { ...x, ...u } : x));
  const deleteUtilisateur = (id: number) => setUtilisateurs(prev => prev.filter(x => x.id !== id));

  const addCategorie = (c: Omit<Categorie, "id">) => setCategories(prev => [...prev, { ...c, id: genId() }]);
  const updateCategorie = (id: number, c: Partial<Categorie>) => setCategories(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));
  const deleteCategorie = (id: number) => setCategories(prev => prev.filter(x => x.id !== id));

  const addDureePrix = (d: Omit<DureePrix, "id">) => setDureesPrix(prev => [...prev, { ...d, id: genId() }]);
  const updateDureePrix = (id: number, d: Partial<DureePrix>) => setDureesPrix(prev => prev.map(x => x.id === id ? { ...x, ...d } : x));
  const deleteDureePrix = (id: number) => setDureesPrix(prev => prev.filter(x => x.id !== id));

  const addPoste = (p: Omit<Poste, "id">) => setPostes(prev => [...prev, { ...p, id: genId() }]);
  const updatePoste = (id: number, p: Partial<Poste>) => setPostes(prev => prev.map(x => x.id === id ? { ...x, ...p } : x));
  const deletePoste = (id: number) => setPostes(prev => prev.filter(x => x.id !== id));

  const addClient = (c: Omit<Client, "id" | "codePromo" | "totalAchats">) =>
    setClients(prev => [...prev, { ...c, id: genId(), codePromo: genCode(), totalAchats: 0 }]);
  const updateClient = (id: number, c: Partial<Client>) => setClients(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));

  const addSession = (s: Omit<Session, "id">): Session => {
    const newSession = { ...s, id: genId() };
    setSessions(prev => [...prev, newSession]);
    return newSession;
  };
  const stopSession = (id: number) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, actif: false, heureFin: new Date().toISOString(), secondsRemaining: 0 } : s));
  };
  const tickSessions = () => {};

  const addRecharge = (r: Omit<Recharge, "id">) => setRecharges(prev => [...prev, { ...r, id: genId() }]);
  const validerRecharge = (id: number, gerantId: number) => {
    const r = recharges.find(x => x.id === id);
    if (!r) return;
    setRecharges(prev => prev.map(x => x.id === id ? { ...x, statut: "validee", gerantValidateur: gerantId } : x));
    setClients(prev => prev.map(c => c.id === r.clientId ? { ...c, creditMonetaire: c.creditMonetaire + r.montant } : c));
  };

  const genererCoupons = (salleId: number, valeur: number, count: number) => {
    const newCoupons: Coupon[] = Array.from({ length: count }, () => ({
      id: genId(), code: genCode(), valeur, statut: "actif" as const, salleId,
    }));
    setCoupons(prev => [...prev, ...newCoupons]);
  };
  const utiliserCoupon = (code: string, clientId: number): boolean => {
    const coupon = coupons.find(c => c.code === code && c.statut === "actif");
    if (!coupon) return false;
    setCoupons(prev => prev.map(c => c.code === code ? { ...c, statut: "utilise", utilisePar: clientId } : c));
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, creditMonetaire: c.creditMonetaire + coupon.valeur } : c));
    return true;
  };

  const genererLicence = (salleId: number, _code: string) => {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const newLic: Licence = {
      id: genId(), salleId,
      codeGenere: `LIC-${new Date().getFullYear()}-${genId()}`,
      joursRestants: 365,
      dateExpiry: expiry.toISOString().split("T")[0],
    };
    setLicences(prev => [...prev.filter(l => l.salleId !== salleId), newLic]);
  };

  const addPromotion = (p: Omit<Promotion, "id" | "dateCreation" | "envoye">) =>
    setPromotions(prev => [...prev, { ...p, id: genId(), dateCreation: new Date().toISOString(), envoye: false }]);
  const envoyerPromotion = (id: number) =>
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, envoye: true } : p));

  const updateBonusConfig = (salleId: number, c: Partial<BonusConfig>) =>
    setBonusConfigs(prev => prev.map(x => x.salleId === salleId ? { ...x, ...c } : x));
  const updatePromoConfig = (salleId: number, c: Partial<PromoConfig>) =>
    setPromoConfigs(prev => prev.map(x => x.salleId === salleId ? { ...x, ...c } : x));

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      salles, addSalle, updateSalle, deleteSalle,
      utilisateurs, addUtilisateur, updateUtilisateur, deleteUtilisateur,
      categories, addCategorie, updateCategorie, deleteCategorie,
      dureesPrix, addDureePrix, updateDureePrix, deleteDureePrix,
      postes, addPoste, updatePoste, deletePoste,
      clients, addClient, updateClient,
      sessions, addSession, stopSession, tickSessions,
      recharges, addRecharge, validerRecharge,
      coupons, genererCoupons, utiliserCoupon,
      licences, genererLicence,
      promotions, addPromotion, envoyerPromotion,
      bonusConfigs, updateBonusConfig,
      promoConfigs, updatePromoConfig,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
