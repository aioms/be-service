ALTER TABLE "roles" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "store_code" text;