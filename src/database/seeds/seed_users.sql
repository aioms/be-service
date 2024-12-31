INSERT INTO users (username, password, salt, fullname, status)
VALUES ('admin', '$2a$10$yyqYbpadt.JmaPGYY.zgue2OwcCFMXuYk.zrDcegMYRPQjNgOP4A.', '$2a$10$yyqYbpadt.JmaPGYY.zgue', 'Admin', 'active')
ON CONFLICT (username) DO NOTHING;
