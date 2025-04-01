-- Migration to convert supplier columns from TEXT to UUID type

-- Fix receipt-import table
ALTER TABLE "receipt-import" 
ALTER COLUMN "supplier" TYPE UUID USING supplier::uuid;

-- Fix receipt-check table
ALTER TABLE "receipt-check" 
ALTER COLUMN "supplier" TYPE UUID USING supplier::uuid;

-- Fix product table
ALTER TABLE "product" 
ALTER COLUMN "supplier" TYPE UUID USING supplier::uuid;

