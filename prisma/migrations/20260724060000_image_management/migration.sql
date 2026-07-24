-- Image management: thumbnails, byte size, upload timestamp, ordering index.
--
-- NOTE: `prisma migrate diff` also proposed `DROP INDEX "Product_search_idx"`
-- and `ALTER TABLE "Product" ALTER COLUMN "search" DROP DEFAULT`, because
-- Prisma models the generated tsvector column as Unsupported() and cannot see
-- its GENERATED ALWAYS AS definition. Applying those would silently destroy
-- full-text search. They are deliberately omitted — the FTS column and its GIN
-- index are owned by the platform_expansion migration and must be left alone.

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "bytes" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "thumbUrl" TEXT;

-- Replace the plain productId index with a composite that also serves the
-- ordering used everywhere images are read (position ASC).
DROP INDEX IF EXISTS "ProductImage_productId_idx";
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");
