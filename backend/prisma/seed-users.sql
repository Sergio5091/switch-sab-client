-- Utilisateurs de test pour SWITCH SAB

-- Admin
INSERT INTO "User" (pseudo, email, telephone, "motDePasse", role, "salleId", active, "createdAt", "updatedAt")
VALUES (
  'admin',
  'admin@switch.bj',
  '+229 01 00 00 01',
  '$2a$10$qPuKSW6a6v3RWD.c6qJpMO2N3eXpH7/H5LuN2tXk2UjXs7Z1.H8O.', -- hash of "admin123"
  'ADMIN',
  1,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Gérant
INSERT INTO "User" (pseudo, email, telephone, "motDePasse", role, "salleId", active, "createdAt", "updatedAt")
VALUES (
  'gerant',
  'gerant@switch.bj',
  '+229 01 00 00 02',
  '$2a$10$qPuKSW6a6v3RWD.c6qJpMO2N3eXpH7/H5LuN2tXk2UjXs7Z1.H8O.', -- hash of "admin123"
  'GERANT',
  1,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Client
INSERT INTO "User" (pseudo, email, telephone, "motDePasse", role, "salleId", active, "createdAt", "updatedAt")
VALUES (
  'client',
  'client@switch.bj',
  '+229 01 00 00 03',
  '$2a$10$qPuKSW6a6v3RWD.c6qJpMO2N3eXpH7/H5LuN2tXk2UjXs7Z1.H8O.', -- hash of "admin123"
  'CLIENT',
  1,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
