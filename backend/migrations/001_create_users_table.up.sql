-- | id | email | name | createtime | deletetime |
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(128) NOT NULL,
    name VARCHAR(128) NOT NULL DEFAULT '',
    createtime TIMESTAMP NOT NULL DEFAULT NOW(),
    deletetime TIMESTAMP DEFAULT NULL
);
