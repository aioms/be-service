-- Check if roles table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        CREATE TABLE roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT UNIQUE NOT NULL
        );
    END IF;
END $$;

-- Insert roles if they don't already exist
INSERT INTO roles (name) VALUES ('supervisor')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name) VALUES ('admin')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name) VALUES ('user')
ON CONFLICT (name) DO NOTHING;

