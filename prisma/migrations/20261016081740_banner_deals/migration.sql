-- AlterTable
ALTER TABLE "public"."Banner" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'saffron';
