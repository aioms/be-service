ALTER TABLE "products" ADD COLUMN "index" serial NOT NULL;

ALTER TABLE "products" DROP CONSTRAINT "products_product_code_unique";--> statement-breakpoint
ALTER TABLE "products" drop column "product_code";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_code" text GENERATED ALWAYS AS (NK"products"."index") STORED;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "selling_price" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "inventory" SET DATA TYPE numeric;--> statement-breakpoint
