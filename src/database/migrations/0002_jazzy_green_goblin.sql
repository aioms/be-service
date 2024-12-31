ALTER TABLE "products" ALTER COLUMN "inventory" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "receipt_imports" ADD COLUMN "status_change_logs" jsonb;