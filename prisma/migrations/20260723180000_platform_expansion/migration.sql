-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'AWAITING_CUSTOMER', 'AWAITING_SUPPORT', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketTopic" AS ENUM ('ORDER_ISSUE', 'DOA_CLAIM', 'SHIPPING', 'PRODUCT_QUESTION', 'WHOLESALE', 'DISTRIBUTOR', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('LEARNING', 'WATER_EDUCATION', 'KNOWLEDGE_BASE');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PAID', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
-- Remap the retired PROCESSING status to its replacement PACKING.
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE WHEN "status"::text = 'PROCESSING' THEN 'PACKING' ELSE "status"::text END::"OrderStatus_new"
);
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "email" TEXT,
ADD COLUMN     "recoveredAt" TIMESTAMP(3),
ADD COLUMN     "recoveryEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "recoveryToken" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "giftCardAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "giftCardId" TEXT,
ADD COLUMN     "giftMessage" TEXT,
ADD COLUMN     "isGift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refundAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "refundReason" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ratingAvg" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soldCount" INTEGER NOT NULL DEFAULT 0;

-- Full-text search: weighted generated tsvector + GIN index. Name matches
-- rank highest, then scientific name / SKU / vendor, then description.
ALTER TABLE "Product" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("scientificName", '') || ' ' || coalesce("sku", '') || ' ' || coalesce("vendor", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'C')
) STORED;

-- CreateIndex
CREATE INDEX "Product_search_idx" ON "Product" USING GIN ("search");

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "adminReply" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyOrderUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyRestock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "visibleToCustomer" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialBalance" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "purchasedById" TEXT,
    "purchaseOrderId" TEXT,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "message" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "subject" TEXT NOT NULL,
    "topic" "TicketTopic" NOT NULL DEFAULT 'OTHER',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL DEFAULT 'LEARNING',
    "heroImageUrl" TEXT,
    "tags" TEXT[],
    "readMinutes" INTEGER NOT NULL DEFAULT 4,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'footer',
    "unsubscribeToken" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_number_key" ON "SupportTicket"("number");

-- CreateIndex
CREATE INDEX "SupportTicket_status_updatedAt_idx" ON "SupportTicket"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_email_idx" ON "SupportTicket"("email");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_category_published_publishedAt_idx" ON "Article"("category", "published", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE INDEX "EmailLog_template_to_idx" ON "EmailLog"("template", "to");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_recoveryToken_key" ON "Cart"("recoveryToken");

-- CreateIndex
CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

-- CreateIndex
CREATE INDEX "Review_productId_approved_idx" ON "Review"("productId", "approved");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
