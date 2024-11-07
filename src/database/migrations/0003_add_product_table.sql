CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'inactive');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text,
	"product_code" text,
	"product_name" text NOT NULL,
	"selling_price" integer,
	"cost_price" numeric,
	"inventory" integer,
	"unit" text,
	"supplier" text,
	"additional_description" text,
	"image_urls" text[] DEFAULT ARRAY[]::text[],
	"warehouse_location" text,
	"status" "product_status" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "products_product_code_unique" UNIQUE("product_code")
);
