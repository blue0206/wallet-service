-- CLEANUP
DROP TABLE IF EXISTS ledger;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS wallets;

DROP TYPE IF EXISTS asset_type_enum;
DROP TYPE IF EXISTS transaction_type_enum;
DROP TYPE IF EXISTS ledger_type_enum;
DROP TYPE IF EXISTS transaction_status_enum;
DROP TYPE IF EXISTS wallet_type_enum;

-- ENUMS

CREATE TYPE asset_type_enum AS ENUM('CP', 'CREDITS');
CREATE TYPE transaction_type_enum AS ENUM('TOPUP', 'SPEND', 'BONUS', 'REWARD', 'PENALTY');
CREATE TYPE ledger_type_enum AS ENUM('DEBIT', 'CREDIT');
CREATE TYPE transaction_status_enum AS ENUM('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE wallet_type_enum AS ENUM('USER', 'SYSTEM_REVENUE', 'SYSTEM_TREASURY');

-- SCHEMA

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallets
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id), -- NULL for system wallets (treasury and revenue)
    wallet_type wallet_type_enum NOT NULL DEFAULT 'USER',
    asset_type asset_type_enum NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, asset_type) -- One CP and one Credits wallet per user.
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id), -- The initiator of transaction
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    type transaction_type_enum NOT NULL,
    status transaction_status_enum NOT NULL DEFAULT 'PENDING',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ledger
CREATE TABLE ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    wallet_id UUID REFERENCES wallets(id),
    type ledger_type_enum NOT NULL,
    amount BIGINT NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES

CREATE INDEX idx_wallets_lookup ON wallets(user_id, asset_type);
CREATE INDEX idx_transactions_actor ON transactions(user_id);
CREATE INDEX idx_ledger_tx ON ledger(transaction_id);
CREATE INDEX idx_ledger_wallet ON ledger(wallet_id);

-- SEEDING

-- Blue user ID: 45afb320-10ea-4d3b-b9c4-f3d2511902a1
-- Blue wallet ID (CP): 9d3da3bd-5093-43b1-9f51-90a5bd2f8d1e
-- Blue wallet ID (C): 5704a8f0-9dfe-4145-b7aa-6aeb6c7ec22f
-- Soap user ID: d77c5d95-54aa-48b8-a5ef-6dd791899234
-- Soap wallet ID (CP): 6715fd89-75fc-46d4-b085-31a0e4998238
-- Soap wallet ID (C): 3778b0da-1f3d-4fa0-9ec7-e476cbf301e0
-- Treasury wallet ID (CP): b779a1dc-096d-414c-9312-b37806d914a2
-- Treasury wallet ID (C): a1d7ee44-540b-470a-8e83-613275360823
-- Revenue wallet ID (CP): e9e68167-e240-4888-b29b-44c06839f986
-- Revenue wallet ID (C): 10ec1ea5-8408-4bf0-b696-7bc964a51e95
-- Transaction Sign-Up Bonus ID (Blue): 998830a5-cab7-4bab-ae9c-7c4695f7fb40
-- Transaction Sign-Up Bonus ID (Soap): 7ff51a18-3664-4ff4-80c9-c40838aeac55

-- Users
INSERT INTO users (id, username, email) VALUES
('45afb320-10ea-4d3b-b9c4-f3d2511902a1', 'Blue', 'blue@cod.com'),
('d77c5d95-54aa-48b8-a5ef-6dd791899234', 'Soap', 'soap@cod.com');

-- System Wallets (Treasury and Revenue)
-- 1. COD Points (CP)
INSERT INTO wallets (id, user_id, wallet_type, asset_type, balance) VALUES
('b779a1dc-096d-414c-9312-b37806d914a2', NULL, 'SYSTEM_TREASURY', 'CP', 1000000000000),
('e9e68167-e240-4888-b29b-44c06839f986', NULL, 'SYSTEM_REVENUE', 'CP', 0);

-- 2. Credits (C)
INSERT INTO wallets (id, user_id, wallet_type, asset_type, balance) VALUES
('a1d7ee44-540b-470a-8e83-613275360823', NULL, 'SYSTEM_TREASURY', 'CREDITS', 1000000000000),
('10ec1ea5-8408-4bf0-b696-7bc964a51e95', NULL, 'SYSTEM_REVENUE', 'CREDITS', 0);

-- User Wallets
-- 1. COD Points (CP)
INSERT INTO wallets (id, user_id, asset_type, balance) VALUES
('9d3da3bd-5093-43b1-9f51-90a5bd2f8d1e', '45afb320-10ea-4d3b-b9c4-f3d2511902a1', 'CP', 0),
('6715fd89-75fc-46d4-b085-31a0e4998238', 'd77c5d95-54aa-48b8-a5ef-6dd791899234', 'CP', 0);

-- 2. Credits (C)
INSERT INTO wallets (id, user_id, asset_type, balance) VALUES
('5704a8f0-9dfe-4145-b7aa-6aeb6c7ec22f', '45afb320-10ea-4d3b-b9c4-f3d2511902a1', 'CREDITS', 0),
('3778b0da-1f3d-4fa0-9ec7-e476cbf301e0', 'd77c5d95-54aa-48b8-a5ef-6dd791899234', 'CREDITS', 0);

-- SIGN-UP BONUS TRANSACTION (Blue)

-- Create transaction
INSERT INTO transactions (id, user_id, idempotency_key, type, status, metadata) VALUES (
    '998830a5-cab7-4bab-ae9c-7c4695f7fb40',
    '45afb320-10ea-4d3b-b9c4-f3d2511902a1',
    'idemp-blue-signup-001',
    'BONUS',
    'SUCCESS',
    '{"reason": "New User Sign-Up"}'
);

-- Double Entry in Ledger (Debit the treasury and credit Blue)
INSERT INTO ledger (transaction_id, wallet_id, type, amount, description) VALUES (
    '998830a5-cab7-4bab-ae9c-7c4695f7fb40',
    'a1d7ee44-540b-470a-8e83-613275360823',
    'DEBIT',
    -250,
    'New user Sign-Up Bonus payout'
);
INSERT INTO ledger (transaction_id, wallet_id, type, amount, description) VALUES (
    '998830a5-cab7-4bab-ae9c-7c4695f7fb40',
    '5704a8f0-9dfe-4145-b7aa-6aeb6c7ec22f',
    'CREDIT',
    250,
    'New user Sign-Up Bonus received'
);

-- Balance update (Treasury and Blue)
UPDATE wallets SET balance = balance - 250 WHERE id = 'a1d7ee44-540b-470a-8e83-613275360823';
UPDATE wallets SET balance = balance + 250 WHERE id = '5704a8f0-9dfe-4145-b7aa-6aeb6c7ec22f';

-- SIGN-UP BONUS TRANSACTION (Soap)

-- Create transaction
INSERT INTO transactions (id, user_id, idempotency_key, type, status, metadata) VALUES (
    '7ff51a18-3664-4ff4-80c9-c40838aeac55',
    'd77c5d95-54aa-48b8-a5ef-6dd791899234',
    'idemp-soap-signup-001',
    'BONUS',
    'SUCCESS',
    '{"reason": "New User Sign-Up"}'
);

-- Double Entry in Ledger (Debit the treasury and credit Soap)
INSERT INTO ledger (transaction_id, wallet_id, type, amount, description) VALUES (
    '7ff51a18-3664-4ff4-80c9-c40838aeac55',
    'a1d7ee44-540b-470a-8e83-613275360823',
    'DEBIT',
    -250,
    'New user Sign-Up Bonus payout'
);
INSERT INTO ledger (transaction_id, wallet_id, type, amount, description) VALUES (
    '7ff51a18-3664-4ff4-80c9-c40838aeac55',
    '3778b0da-1f3d-4fa0-9ec7-e476cbf301e0',
    'CREDIT',
    250,
    'New user Sign-Up Bonus received'
);

-- Balance Update (Treasury and Soap)
UPDATE wallets SET balance = balance - 250 WHERE id = 'a1d7ee44-540b-470a-8e83-613275360823';
UPDATE wallets SET balance = balance + 250 WHERE id = '3778b0da-1f3d-4fa0-9ec7-e476cbf301e0';
