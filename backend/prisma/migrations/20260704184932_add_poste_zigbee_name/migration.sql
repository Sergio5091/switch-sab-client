-- AlterTable
ALTER TABLE "Poste" ADD COLUMN     "zigbeeName" TEXT;

-- AlterTable
ALTER TABLE "Salle" ALTER COLUMN "switchType" SET DEFAULT 'MOCK';
