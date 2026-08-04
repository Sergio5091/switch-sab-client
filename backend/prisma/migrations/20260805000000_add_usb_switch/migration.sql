-- AlterTable: Salle — champs USB switch multi-relais
ALTER TABLE "Salle" ADD COLUMN IF NOT EXISTS "usbPortPath" TEXT;
ALTER TABLE "Salle" ADD COLUMN IF NOT EXISTS "usbNbRelais" INTEGER;

-- AlterTable: Poste — numéro de relais USB et dernier état connu
ALTER TABLE "Poste" ADD COLUMN IF NOT EXISTS "usbRelaisNumero" INTEGER;
ALTER TABLE "Poste" ADD COLUMN IF NOT EXISTS "usbDernierEtat" TEXT DEFAULT 'OFF';
