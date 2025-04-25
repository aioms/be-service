INSERT INTO users (code, username, password, salt, fullname, status)
VALUES ('AD1', 'admin', '$2a$10$yyqYbpadt.JmaPGYY.zgue2OwcCFMXuYk.zrDcegMYRPQjNgOP4A.', '$2a$10$yyqYbpadt.JmaPGYY.zgue', 'Admin', 'active')
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (code, username, password, salt, fullname, status)
VALUES ('DEV1', 'developer', '$2a$10$yyqYbpadt.JmaPGYY.zgue2OwcCFMXuYk.zrDcegMYRPQjNgOP4A.', '$2a$10$yyqYbpadt.JmaPGYY.zgue', 'Developer', 'active')
ON CONFLICT (username) DO NOTHING;
