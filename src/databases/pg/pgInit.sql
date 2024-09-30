-- 거래소 생성
CREATE TABLE IF NOT EXISTS exchanges (
    id SERIAL PRIMARY KEY,
    domestic VARCHAR(15) NOT NULL,  -- 국내 거래소
    overseas VARCHAR(15) NOT NULL   -- 해외 거래소
);

-- 기본 거래소 국내: upbit, 해외: binance
INSERT INTO exchanges (domestic, overseas)
SELECT 'upbit', 'binance'
WHERE NOT EXISTS (
    SELECT domestic, overseas
    FROM exchanges
    WHERE domestic = 'upbit' AND overseas = 'binance'
);

-- User에 관련된 Table 생성
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    role VARCHAR(10) CHECK (role IN ('god', 'diamond', 'platinum', 'gold', 'silver', 'bronze')) -- 등급 나눠서 구독?
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    email VARCHAR(40) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    salt uuid NOT NULL,
    user_role_id INTEGER REFERENCES user_roles(id),
    selected_user_env_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_envs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    exchange_id INTEGER REFERENCES exchanges(id),
    domestic_access_key VARCHAR(255) NOT NULL,
    domestic_access_iv VARCHAR(32) NOT NULL,
    domestic_secret_key VARCHAR(255) NOT NULL,
    domestic_secret_iv VARCHAR(32) NOT NULL,
    overseas_access_key VARCHAR(255) NOT NULL,
    overseas_access_iv VARCHAR(32) NOT NULL,
    overseas_secret_key VARCHAR(255) NOT NULL,
    overseas_secret_iv VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users테이블에 Foreign키 추가
ALTER TABLE users ADD CONSTRAINT fk_selected_user_env
    FOREIGN KEY (selected_user_env_id) REFERENCES user_envs(id);

-- 차트에 관련된 Table 생성
CREATE TABLE IF NOT EXISTS symbols (
    id SERIAL PRIMARY KEY,
    name VARCHAR(10) NOT NULL,
    exchange_id INTEGER REFERENCES exchanges(id)
);

CREATE TABLE IF NOT EXISTS symbol_prices (
    id SERIAL PRIMARY KEY,
    symbol_id INTEGER REFERENCES symbols(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    premium FLOAT NOT NULL,
    domestic INTEGER NOT NULL,
    overseas FLOAT NOT NULL,
    usd_to_krw FLOAT NOT NULL,
    domestic_trade_at TIMESTAMP NOT NULL,
    overseas_trade_at TIMESTAMP NOT NULL
);

-- 주문에 관련된 Table 생성
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    symbol_id INTEGER REFERENCES symbols(id),
    user_id INTEGER REFERENCES users(id),
    is_close BOOLEAN DEFAULT FALSE,
    net_profit_rate FLOAT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_details (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    status VARCHAR(4) CHECK (status IN ('buy', 'sell')),
    premium FLOAT NOT NULL,
    domestic INTEGER NOT NULL,
    overseas FLOAT NOT NULL,
    usd_to_krw FLOAT NOT NULL,
    is_maker BOOLEAN DEFAULT FALSE,
    domestic_trade_at TIMESTAMP NOT NULL,
    overseas_trade_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 기본 Symbol (btc, eth) 생성
INSERT INTO symbols (name, exchange_id)
SELECT 'btc', e.id
FROM exchanges e
WHERE
e.domestic = 'upbit' AND e.overseas = 'binance'
AND
NOT EXISTS (
    SELECT 1 FROM symbols s
    WHERE s.name = 'btc' AND s.exchange_id = e.id
);

INSERT INTO symbols (name, exchange_id)
SELECT 'eth', e.id
FROM exchanges e
WHERE
e.domestic = 'upbit' AND e.overseas = 'binance'
AND
NOT EXISTS (
    SELECT 1 FROM symbols s
    WHERE s.name = 'eth' AND s.exchange_id = e.id
);
