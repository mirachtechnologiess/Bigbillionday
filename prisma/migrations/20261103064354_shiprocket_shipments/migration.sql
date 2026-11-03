-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'shiprocket',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "channelOrderId" TEXT NOT NULL,
    "srOrderId" TEXT,
    "srShipmentId" TEXT,
    "awb" TEXT,
    "courierId" INTEGER,
    "courierName" TEXT,
    "charge" DOUBLE PRECISION,
    "status" TEXT,
    "pickupScheduledAt" TEXT,
    "pickupToken" TEXT,
    "labelUrl" TEXT,
    "manifestUrl" TEXT,
    "trackUrl" TEXT,
    "etd" TEXT,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "lengthCm" INTEGER NOT NULL,
    "breadthCm" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "activities" JSONB,
    "rto" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_awb_idx" ON "Shipment"("awb");

-- CreateIndex
CREATE INDEX "Shipment_closed_lastSyncedAt_idx" ON "Shipment"("closed", "lastSyncedAt");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
