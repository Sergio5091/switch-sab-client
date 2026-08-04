-- AlterTable
ALTER TABLE "ConfigBonus" ADD COLUMN     "bonusFilleul" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Salle" ADD COLUMN     "dernierExportContacts" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "indicatifPays" TEXT NOT NULL DEFAULT 'BJ';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "solde" DOUBLE PRECISION NOT NULL DEFAULT 0;
