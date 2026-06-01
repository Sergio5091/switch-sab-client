import api from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'gerant' | 'client';
}

export interface AuthResponse {
  token: string;
  user: User;
}

const authService = {
  /**
   * Login utilisateur
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('currentUser', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Register nouvel utilisateur
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('currentUser', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Récupérer l'utilisateur courant
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  /**
   * Logout utilisateur
   */
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  },

  /**
   * Récupérer le token stocké
   */
  getToken: (): string | null => {
    return localStorage.getItem('authToken');
  },

  /**
   * Récupérer l'utilisateur du localStorage
   */
  getStoredUser: (): User | null => {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  },
};

export default authService;
