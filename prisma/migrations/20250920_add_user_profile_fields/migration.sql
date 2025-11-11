-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN "phoneCountry" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "birthdate" TIMESTAMP(3);
