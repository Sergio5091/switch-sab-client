// Exporter tous les services
export { default as authService } from './authService';
export { default as adminService } from './adminService';
export { default as gerantService } from './gerantService';
export { default as clientService } from './clientService';
export { default as api } from './api';

// Exporter les types
export type { User, LoginRequest, RegisterRequest, AuthResponse } from './authService';
export type {
  Category,
  Duree,
  Poste,
  Gerant,
  Bonus,
  Coupon,
  Promotion,
} from './adminService';
export type {
  Session,
  Client,
  Recharge,
} from './gerantService';
export type {
  ClientSession,
  ClientRecharge,
  Coupon as ClientCoupon,
  PromoCode,
  Promotion as ClientPromotion,
  Leaderboard,
} from './clientService';
