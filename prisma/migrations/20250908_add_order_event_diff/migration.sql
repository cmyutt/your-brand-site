-- OrderEvent에 diff JSONB 필드 추가
ALTER TABLE "OrderEvent" ADD COLUMN "diff" JSONB;
