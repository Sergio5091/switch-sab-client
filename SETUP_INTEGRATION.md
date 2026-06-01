# Setup Guide - Frontend & Backend Integration

## Installation

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update the `DATABASE_URL` with your PostgreSQL connection string
   - Set your `JWT_SECRET`
   - Set `CORS_ORIGIN` to your frontend URL

3. **Setup database:**
   ```bash
   npx prisma migrate dev
   npm run seed
   ```

4. **Start the backend server:**
   ```bash
   npm run dev
   ```
   Backend will run on `http://localhost:3000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Ensure `VITE_API_URL` is set to `http://localhost:3000/api`

3. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

## API Services

The frontend includes pre-configured API services for easy backend integration:

### Services Available

- **authService** - Authentication (login, register, logout, getCurrentUser)
- **adminService** - Admin operations (categories, durees, postes, gerants, bonus, coupons, promotions)
- **gerantService** - Gérant operations (sessions, clients, recharges, rapports)
- **clientService** - Client operations (sessions, recharges, coupons, promo codes, leaderboard)

### Usage Example

```typescript
import { authService, clientService } from '@/services';

// Login
const response = await authService.login({
  email: 'user@example.com',
  password: 'password'
});

// Get client data
const clients = await clientService.getSessions();
```

## API Base URL

The API base URL is configured in `frontend/.env`:
```
VITE_API_URL=http://localhost:3000/api
```

## Authentication

All requests automatically include the JWT token from localStorage. The token is added to request headers as:
```
Authorization: Bearer <token>
```

If a 401 response is received, the user is automatically redirected to the login page.

## CORS Configuration

Make sure your backend CORS settings allow requests from your frontend URL:
- Development: `http://localhost:5173`
- Production: Your production domain

## Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running on port 3000
- Check that `VITE_API_URL` is correct in frontend `.env`
- Check CORS settings in backend `.env`

### "Unauthorized (401)" errors
- Token may have expired
- Check that JWT_SECRET is the same in backend
- Clear localStorage and login again

### "Database connection error"
- Ensure PostgreSQL is running
- Check DATABASE_URL in backend `.env`
- Run migrations: `npx prisma migrate dev`
