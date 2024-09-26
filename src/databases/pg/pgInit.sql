CREATE TABLE IF NOT EXISTS symbols (
    id SERIAL PRIMARY KEY,
    name VARCHAR(10) NOT NULL UNIQUE,
    domestic VARCHAR(10) NOT NULL,
    overseas VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS symbol_prices (
    symbol_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    premium REAL,
    domestic INTEGER,
    overseas REAL,
    exchange_rate REAL,
    domestic_trade_at TIMESTAMP NOT NULL,
    overseas_trade_at TIMESTAMP NOT NULL,
    PRIMARY KEY (symbol_id, created_at),
    FOREIGN KEY (symbol_id) REFERENCES symbols(id)
);