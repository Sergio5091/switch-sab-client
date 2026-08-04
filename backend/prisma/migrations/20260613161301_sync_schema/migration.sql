/*
  Warnings:

  - You are about to drop the `Licence` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[salleId]` on the table `ConfigBonus` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `salleId` to the `ConfigBonus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salleId` to the `Coupon` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConfigBonus" ADD COLUMN     "salleId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "salleId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Salle" ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "nom" TEXT,
ADD COLUMN     "prenom" TEXT;

-- DropTable
DROP TABLE "Licence";

-- CreateTable
CREATE TABLE "LicenceLocale" (
    "id" SERIAL NOT NULL,
    "licenceId" TEXT NOT NULL,
    "salleId" INTEGER NOT NULL,
    "machineId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "signature" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenceLocale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LicenceLocale_licenceId_key" ON "LicenceLocale"("licenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigBonus_salleId_key" ON "ConfigBonus"("salleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigBonus" ADD CONSTRAINT "ConfigBonus_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
