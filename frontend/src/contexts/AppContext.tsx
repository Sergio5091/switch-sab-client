import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { axiosInstance } from "@/lib/axios";

export type Role = "superadmin" | "admin" | "gerant" | "client";

export interface LicenceStatut {
  statut: "AUCUNE" | "ACTIVE" | "INVALIDE";
  message: string;
  machineId: string;
  joursRestants: number;
  licenceId?: string;
  expiresAt?: string;
}

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
}

interface AppContextType {
  currentUser: Utilisateur | null;
  login: (email: string, password: string) => Promise<{ success: boolean; licenceRequired: boolean; salleRequired: boolean }>;
  logout: () => void;
  licenceStatut: LicenceStatut | null;
  checkLicenceStatut: () => Promise<LicenceStatut | null>;
  activerLicence: (licenceData: any) => Promise<boolean>;
  fraudeDetectee: boolean;
  messageFraude: string;
  resetFraude: () => void;
  salleConfiguree: boolean | null;
  checkSetupStatut: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(() => {
    try {
      const stored = localStorage.getItem("switch_sab_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [licenceStatut, setLicenceStatut] = useState<LicenceStatut | null>(null);
  const [fraudeDetectee, setFraudeDetectee] = useState(false);
  const [messageFraude, setMessageFraude] = useState("");
  const [salleConfiguree, setSalleConfiguree] = useState<boolean | null>(null);

  useEffect(() => {
    if (currentUser) {
      checkLicenceStatut();
    }
  }, [currentUser]);

  const checkSetupStatut = useCallback(async (): Promise<boolean> => {
    try {
      const response = await axiosInstance.get<{ salleConfiguree: boolean }>("/setup/statut");
      setSalleConfiguree(response.data.salleConfiguree);
      return response.data.salleConfiguree;
    } catch {
      setSalleConfiguree(false);
      return false;
    }
  }, []);

  const checkLicenceStatut = useCallback(async (): Promise<LicenceStatut | null> => {
    try {
      const response = await axiosInstance.get<LicenceStatut>("/licence/statut");
      const statut = response.data;
      setLicenceStatut(statut);

      // Détection de fraude
      if (statut.statut === "INVALIDE" && statut.message.toLowerCase().includes("fraude")) {
        setFraudeDetectee(true);
        setMessageFraude(statut.message);
      }

      return statut;
    } catch (error) {
      console.error("Erreur vérification licence:", error);
      return null;
    }
  }, []);

  // Poll toutes les 60 secondes pour détecter une fraude en temps réel
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      checkLicenceStatut();
    }, 60_000);
    return () => clearInterval(interval);
  }, [currentUser, checkLicenceStatut]);

  const activerLicence = useCallback(async (licenceData: any): Promise<boolean> => {
    try {
      await axiosInstance.post("/licence/activer", licenceData);
      const statut = await checkLicenceStatut();
      if (statut?.statut === "ACTIVE") {
        setFraudeDetectee(false);
        setMessageFraude("");
      }
      return statut?.statut === "ACTIVE";
    } catch (error) {
      console.error("Erreur activation licence:", error);
      return false;
    }
  }, [checkLicenceStatut]);

  const resetFraude = useCallback(() => {
    setFraudeDetectee(false);
    setMessageFraude("");
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; licenceRequired: boolean; salleRequired: boolean }> => {
    try {
      const response = await axiosInstance.post('/auth/login', {
        identifiant: email,
        motDePasse: password,
      });

      if (response.data?.token && response.data?.user) {
        const u = response.data.user;
        const user: Utilisateur = {
          id:     u.id,
          nom:    u.nom ?? "",
          prenom: u.prenom ?? "",
          pseudo: u.pseudo,
          email:  u.email ?? "",
          phone:  u.telephone ?? "",
          role:   (u.role as string).toLowerCase() as Role,
          salleId: u.salleId ?? 1,
          actif:  u.active,
        };
        setCurrentUser(user);
        localStorage.setItem("switch_sab_user", JSON.stringify(user));
        localStorage.setItem("authToken", response.data.token);

        // Vérifier setup salle (seulement pour admin)
        let salleRequired = false;
        if ((u.role as string).toLowerCase() === "admin") {
          salleRequired = !(await checkSetupStatut());
        }

        // Vérifier licence
        const statut = await checkLicenceStatut();
        const licenceRequired = !salleRequired && statut?.statut !== "ACTIVE";

        return { success: true, licenceRequired, salleRequired };
      }
      throw new Error('Réponse invalide du serveur');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Erreur de connexion. Vérifiez que le serveur est démarré.';
      throw new Error(message);
    }
  }, [checkLicenceStatut, checkSetupStatut]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("switch_sab_user");
    localStorage.removeItem("authToken");
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      licenceStatut, checkLicenceStatut, activerLicence,
      fraudeDetectee, messageFraude, resetFraude,
      salleConfiguree, checkSetupStatut,
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
