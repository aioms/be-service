ALTER TABLE "products" ALTER COLUMN "index" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "gen_name";