-- Shippo integration: label/tracking metadata on Shipment
-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "eta" TIMESTAMP(3),
ADD COLUMN     "shippoRateId" TEXT,
ADD COLUMN     "shippoTransactionId" TEXT,
ADD COLUMN     "trackingUrl" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");
