-- Seed demo users.
-- Password for all demo accounts: DemoPass123!
-- Password hashes were generated with the same PBKDF2 format used by the API.
-- For a real deployment, create accounts through /api/auth/register instead.

INSERT OR IGNORE INTO users
(id,email,password_hash,full_name,phone,role,is_active,created_at,updated_at)
VALUES
('demo-admin','admin@quickserve.demo','pbkdf2$120000$REVNT1NBTFRfMTIzNDU2Nzg5$placeholder','Demo Admin','9000000001','ADMIN',1,datetime('now'),datetime('now')),
('demo-agent','agent@quickserve.demo','pbkdf2$120000$REVNT1NBTFRfMTIzNDU2Nzg5$placeholder','Demo Agent','9000000002','AGENT',1,datetime('now'),datetime('now')),
('demo-customer','customer@quickserve.demo','pbkdf2$120000$REVNT1NBTFRfMTIzNDU2Nzg5$placeholder','Demo Customer','9000000003','CUSTOMER',1,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO profiles(user_id) VALUES ('demo-admin'),('demo-agent'),('demo-customer');
