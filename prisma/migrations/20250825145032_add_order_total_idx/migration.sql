-- CreateIndex
CREATE INDEX "Order_totalAmount_createdAt_idx" ON "public"."Order"("totalAmount", "createdAt");
