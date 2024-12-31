CREATE TYPE "public"."receipt_return_status" AS ENUM('draft', 'processing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."receipt_return_type" AS ENUM('customer', 'supplier');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "receipt_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_number" text,
	"name" text,
	"note" text,
	"quantity" integer NOT NULL,
	"total_product" integer NOT NULL,
	"total_amount" numeric NOT NULL,
	"reason" text,
	"warehouse_location" text,
	"status" "receipt_return_status" NOT NULL,
	"type" "receipt_return_type" NOT NULL,
	"return_date" timestamp,
	"user_created" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "receipt_returns_receipt_number_unique" UNIQUE("receipt_number")
);
