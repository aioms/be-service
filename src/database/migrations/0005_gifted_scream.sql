ALTER TABLE "products" ALTER COLUMN "index" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "index" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_index_unique" UNIQUE("index");