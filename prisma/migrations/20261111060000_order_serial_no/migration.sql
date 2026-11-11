-- S.No: number existing orders 1..n by when they were placed, then continue with a sequence.
ALTER TABLE "Order" ADD COLUMN "serialNo" INTEGER;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS n FROM "Order"
)
UPDATE "Order" o SET "serialNo" = numbered.n FROM numbered WHERE o.id = numbered.id;

CREATE SEQUENCE "Order_serialNo_seq" AS INTEGER OWNED BY "Order"."serialNo";
SELECT setval('"Order_serialNo_seq"', COALESCE((SELECT MAX("serialNo") FROM "Order"), 0) + 1, false);
ALTER TABLE "Order" ALTER COLUMN "serialNo" SET DEFAULT nextval('"Order_serialNo_seq"');
ALTER TABLE "Order" ALTER COLUMN "serialNo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_serialNo_key" ON "Order"("serialNo");
